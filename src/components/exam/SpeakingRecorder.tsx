"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { playTTS, stopAudio, unlockAudio } from "@/lib/tts/player";

type TFn = (path: string, params?: Record<string, string | number>) => string;

// ---- Grabador de voz para Speaking (MediaRecorder + subida al servidor) ----
// Flujo automático: se lee la pregunta en voz alta y, al terminar, arranca sola
// la grabación con una cuenta regresiva (60/90 s) que se detiene y sube al llegar
// a cero. El micrófono se pide dentro del gesto del usuario (requisito en móvil).
type RecState = "idle" | "reading" | "recording" | "uploading" | "error";
type RecError = "mic" | "record" | "upload";

// Formato de grabación: MP4/AAC si el navegador puede (se reproduce en cualquier
// equipo, también en iPhone y Mac); si no, el que elija el navegador.
const RECORDING_TYPES = ["audio/mp4;codecs=mp4a.40.2", "audio/mp4", "audio/webm;codecs=opus", "audio/webm"];

function createRecorder(stream: MediaStream): MediaRecorder {
  const type =
    typeof MediaRecorder.isTypeSupported === "function"
      ? RECORDING_TYPES.find((candidate) => MediaRecorder.isTypeSupported(candidate))
      : undefined;
  if (type) {
    try {
      return new MediaRecorder(stream, { mimeType: type });
    } catch {
      /* algunos navegadores dicen soportarlo y luego fallan: formato por defecto */
    }
  }
  return new MediaRecorder(stream);
}

// Tiempo máximo de espera a que termine la lectura de la pregunta. Si la voz no
// arranca o no avisa al terminar (pasa en algunos celulares), la grabación
// empieza igual: ~0,5 s por palabra más un margen.
function readingTimeoutMs(text: string): number {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.min(60_000, Math.max(8_000, words * 500 + 5_000));
}

// iOS solo deja hablar a la voz del navegador si la primera frase se pide dentro
// de un toque del usuario: se "despierta" con una frase vacía y en silencio.
function primeSpeech(): void {
  try {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      const u = new SpeechSynthesisUtterance(" ");
      u.volume = 0;
      speechSynthesis.speak(u);
    }
  } catch {
    /* ignore */
  }
}

export default function SpeakingRecorder({
  existingUrl,
  onUploaded,
  promptText,
  limitSeconds,
  t,
}: {
  existingUrl: string | null;
  onUploaded: (url: string) => void;
  promptText: string;
  limitSeconds: number;
  t: TFn;
}) {
  const [state, setState] = useState<RecState>("idle");
  const [errorKind, setErrorKind] = useState<RecError>("mic");
  const [elapsed, setElapsed] = useState(0);
  const [supported, setSupported] = useState(true);
  // Grabación que no se pudo subir, para reintentar sin volver a grabar.
  const [failedBlob, setFailedBlob] = useState<Blob | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<number | null>(null);
  // Espera máxima de la lectura de la pregunta y atajo para grabar ya.
  const readTimerRef = useRef<number | null>(null);
  const skipReadingRef = useRef<(() => void) | null>(null);
  // Referencia a la frase que se está leyendo: si el navegador la descarta de
  // memoria, nunca avisa que terminó (pasa en Chrome).
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const aliveRef = useRef(true);

  const fail = useCallback((kind: RecError) => {
    setErrorKind(kind);
    setState("error");
  }, []);

  useEffect(() => {
    setSupported(
      typeof window !== "undefined" &&
        !!navigator.mediaDevices &&
        typeof window.MediaRecorder !== "undefined"
    );
  }, []);

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((tr) => tr.stop());
    streamRef.current = null;
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // Limpieza al desmontar (p. ej. al cambiar de sección).
  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
      if (readTimerRef.current) window.clearTimeout(readTimerRef.current);
      skipReadingRef.current = null;
      try {
        if (typeof window !== "undefined" && "speechSynthesis" in window) speechSynthesis.cancel();
        if (recorderRef.current?.state === "recording") recorderRef.current.stop();
      } catch {
        /* ignore */
      }
      stopStream();
    };
  }, [stopStream]);

  const upload = useCallback(
    async (blob: Blob) => {
      setState("uploading");
      try {
        const fd = new FormData();
        fd.append("file", blob, "recording");
        const res = await fetch("/api/exam/audio", { method: "POST", body: fd });
        if (!res.ok) throw new Error("upload failed");
        const data = (await res.json()) as { url: string };
        setFailedBlob(null);
        onUploaded(data.url);
        setState("idle");
      } catch {
        setFailedBlob(blob);
        fail("upload");
      }
    },
    [onUploaded, fail]
  );

  // Arranca la grabación sobre el stream ya abierto (tras leer la pregunta).
  const recordOnStream = useCallback(() => {
    const stream = streamRef.current;
    if (!stream) {
      fail("record");
      return;
    }
    try {
      const mr = createRecorder(stream);
      chunksRef.current = [];
      mr.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mr.mimeType || "audio/webm" });
        stopStream();
        void upload(blob);
      };
      mr.start();
      recorderRef.current = mr;
      setElapsed(0);
      setState("recording");
      timerRef.current = window.setInterval(() => setElapsed((e) => e + 1), 1000);
    } catch {
      fail("record");
      stopStream();
    }
  }, [stopStream, upload, fail]);

  // Botón principal: pide micrófono (dentro del gesto) → lee la pregunta →
  // al terminar la lectura, graba automáticamente.
  const begin = useCallback(async () => {
    if (!supported) return;
    unlockAudio(); // dentro del gesto (iOS)
    primeSpeech(); // ídem para la voz del navegador
    setFailedBlob(null);
    try {
      streamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      fail("mic");
      return;
    }
    setState("reading");

    // La grabación arranca UNA vez: al terminar la lectura, si el alumno pulsa
    // "Grabar ahora" o al vencer la espera máxima (si la voz nunca termina).
    let started = false;
    const go = () => {
      if (started || !aliveRef.current) return;
      started = true;
      if (readTimerRef.current) {
        window.clearTimeout(readTimerRef.current);
        readTimerRef.current = null;
      }
      skipReadingRef.current = null;
      stopAudio();
      if ("speechSynthesis" in window) speechSynthesis.cancel();
      recordOnStream();
    };
    skipReadingRef.current = go;
    readTimerRef.current = window.setTimeout(go, readingTimeoutMs(promptText));

    // Respaldo con la voz del navegador si ElevenLabs no está disponible.
    const readWithBrowser = () => {
      try {
        if ("speechSynthesis" in window && promptText) {
          speechSynthesis.cancel();
          const u = new SpeechSynthesisUtterance(promptText);
          u.lang = "en-US";
          u.rate = 0.95;
          u.onend = go;
          u.onerror = go;
          utteranceRef.current = u;
          speechSynthesis.speak(u);
        } else {
          go();
        }
      } catch {
        go();
      }
    };
    playTTS(promptText, { dialogue: false }).then(go).catch(readWithBrowser);
  }, [supported, promptText, recordOnStream, fail]);

  const stop = useCallback(() => {
    try {
      recorderRef.current?.stop();
    } catch {
      /* ignore */
    }
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const retryUpload = useCallback(() => {
    if (failedBlob) void upload(failedBlob);
  }, [upload, failedBlob]);

  // Auto-detiene al llegar al límite de tiempo.
  useEffect(() => {
    if (state === "recording" && elapsed >= limitSeconds) stop();
  }, [state, elapsed, limitSeconds, stop]);

  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  const remaining = Math.max(0, limitSeconds - elapsed);
  const canRetryUpload = state === "error" && errorKind === "upload" && !!failedBlob;
  const errorText =
    errorKind === "upload" ? t("exam.uploadFailed") : errorKind === "record" ? t("exam.recordFailed") : t("exam.micDenied");

  if (!supported) {
    return (
      <p className="mt-4 rounded-xl bg-amber-500/10 px-4 py-3 text-sm font-medium text-amber-300">
        {t("exam.micUnsupported")}
      </p>
    );
  }

  return (
    <div className="mt-4 flex flex-col gap-3">
      {(state === "idle" || state === "error") && (
        <p className="text-xs text-slate-400">
          {t("exam.speakAutoHint", { s: limitSeconds })}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3">
        {state === "reading" ? (
          <>
            <span className="inline-flex items-center gap-2 rounded-full glass px-5 py-2.5 text-sm font-bold text-cyan-200">
              <span className="flex items-end gap-0.5" aria-hidden>
                <span className="h-2 w-0.5 animate-pulse bg-cyan-300" />
                <span className="h-3 w-0.5 animate-pulse bg-cyan-300 [animation-delay:120ms]" />
                <span className="h-1.5 w-0.5 animate-pulse bg-cyan-300 [animation-delay:240ms]" />
              </span>
              {t("exam.speakReading")}
            </span>
            <button
              onClick={() => skipReadingRef.current?.()}
              className="rounded-full px-4 py-2.5 text-sm font-bold text-cyan-300 transition hover:bg-white/5 hover:text-cyan-200"
            >
              {t("exam.recordNow")} →
            </button>
          </>
        ) : state === "recording" ? (
          <button
            onClick={stop}
            className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-rose-500 to-red-600 px-5 py-2.5 text-sm font-bold text-white shadow-[0_8px_24px_-10px_rgba(244,63,94,0.7)] transition hover:brightness-110 active:scale-95"
          >
            <span className="h-2.5 w-2.5 rounded-sm bg-white" aria-hidden />
            {t("exam.stop")} · {fmt(remaining)}
          </button>
        ) : state === "uploading" ? (
          <span className="inline-flex items-center gap-2 rounded-full glass px-5 py-2.5 text-sm font-bold text-slate-300">
            <span className="h-4 w-4 rounded-full border-2 border-cyan-400/30 border-t-cyan-400 animate-spin" />
            {t("exam.savingAudio")}
          </span>
        ) : canRetryUpload ? (
          <button
            onClick={retryUpload}
            className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-cyan-500 to-indigo-500 px-5 py-2.5 text-sm font-bold text-white shadow-lg transition hover:scale-105"
          >
            <span aria-hidden>↻</span>
            {t("exam.retryUpload")}
          </button>
        ) : (
          <button
  disabled={!!existingUrl}
  onClick={begin}
  className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-cyan-500 to-indigo-500 px-5 py-2.5 text-sm font-bold text-white shadow-lg transition hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
>
  <span aria-hidden>▶</span>
  {existingUrl ? "Audio guardado" : t("exam.speakStart")}
</button>
        )}

        {state === "recording" && (
          <span className="text-xs font-semibold text-slate-400">{t("exam.speakAutoStop")}</span>
        )}

        {existingUrl && (state === "idle" || state === "error") && (
          <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-emerald-300">
            <span aria-hidden>✓</span> {t("exam.recorded")}
          </span>
        )}
      </div>

      {state === "error" && (
        <p role="alert" className="rounded-xl bg-rose-500/10 px-4 py-3 text-sm font-medium text-rose-300">
          {errorText}
        </p>
      )}

      {existingUrl && (state === "idle" || state === "error") && (
        <audio controls src={existingUrl} className="w-full max-w-md" />
      )}
    </div>
  );
}
