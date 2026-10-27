"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
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

const subscribeNothing = () => () => {};

// Una grabación real de varios segundos ocupa decenas de KB; menos que esto es
// una grabación vacía (el micrófono no entregó audio).
const MIN_RECORDING_BYTES = 1024;

// Micrófono para grabar, pedido justo antes de empezar. En iPhone, leer la
// pregunta en voz alta con el micrófono ya abierto puede interrumpirlo y la
// grabación sale vacía; por eso se abre uno nuevo (el permiso ya se dio y no
// vuelve a preguntar). Si no se puede, se usa el anterior mientras siga vivo.
async function freshMicStream(current: MediaStream | null): Promise<MediaStream | null> {
  try {
    const fresh = await navigator.mediaDevices.getUserMedia({ audio: true });
    if (current && current !== fresh) current.getTracks().forEach((tr) => tr.stop());
    return fresh;
  } catch {
    const track = current?.getAudioTracks()[0];
    return track && track.readyState === "live" ? current : null;
  }
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
  // Detalle técnico breve del error, visible en el aviso para poder diagnosticar
  // a distancia (p. ej. una captura que manda el alumno).
  const [errorCode, setErrorCode] = useState("");
  const [elapsed, setElapsed] = useState(0);
  // ¿El navegador puede grabar? En el servidor se asume que sí hasta comprobarlo.
  const supported = useSyncExternalStore(
    subscribeNothing,
    () => !!navigator.mediaDevices && typeof window.MediaRecorder !== "undefined",
    () => true
  );
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

  const fail = useCallback((kind: RecError, code = "") => {
    setErrorKind(kind);
    setErrorCode(code);
    setState("error");
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
        if (!res.ok) {
          const err = ((await res.json().catch(() => ({}))) as { error?: string }).error;
          if (err === "empty") {
            // Reintentar la subida no serviría: hay que volver a grabar.
            setFailedBlob(null);
            fail("record", "empty-recording");
            return;
          }
          setFailedBlob(blob);
          fail("upload", `http-${res.status}${err ? `-${err}` : ""}`);
          return;
        }
        const data = (await res.json()) as { url: string };
        setFailedBlob(null);
        onUploaded(data.url);
        setState("idle");
      } catch {
        setFailedBlob(blob);
        fail("upload", "network");
      }
    },
    [onUploaded, fail]
  );

  // Arranca la grabación (tras leer la pregunta) con un micrófono recién abierto.
  const recordOnStream = useCallback(async () => {
    const stream = await freshMicStream(streamRef.current);
    if (!aliveRef.current) {
      stream?.getTracks().forEach((tr) => tr.stop());
      return;
    }
    streamRef.current = stream;
    if (!stream) {
      fail("record", "mic-lost");
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
        // Grabación vacía: no se sube (no se podría escuchar); se pide grabar de nuevo.
        if (blob.size < MIN_RECORDING_BYTES) {
          fail("record", `empty-recording-${blob.size}`);
          return;
        }
        void upload(blob);
      };
      // Entrega el audio en partes de 1 s: Safari a veces no entrega nada si
      // se espera al final de la grabación.
      mr.start(1000);
      recorderRef.current = mr;
      setElapsed(0);
      setState("recording");
      timerRef.current = window.setInterval(() => setElapsed((e) => e + 1), 1000);
    } catch (e) {
      fail("record", `recorder-${e instanceof Error ? e.name : "error"}`);
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
    } catch (e) {
      fail("mic", `mic-${e instanceof Error ? e.name : "error"}`);
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
      void recordOnStream();
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
          {errorCode && <span className="ml-1.5 text-xs opacity-60">({errorCode})</span>}
        </p>
      )}

      {existingUrl && (state === "idle" || state === "error") && (
        <audio controls src={existingUrl} className="w-full max-w-md" />
      )}
    </div>
  );
}
