"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  getAudioEl,
  fetchTts,
  unlockAudio,
  stopAudio,
  speakDialogueBrowser,
} from "@/lib/tts/player";

export type ListenStatus = "idle" | "loading" | "playing" | "paused";

// Velocidades tipo Duolingo (normal → lento → más lento).
export const SPEEDS = [1, 0.75, 0.5] as const;

// Controla la reproducción del listening con pausa/reanudar/stop y velocidad.
// Usa el audio de ElevenLabs si está disponible (controles nativos) y cae a la
// voz del navegador (pausa/reanudar/stop; el cambio de velocidad re-inicia).
export function useListenPlayer() {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [status, setStatus] = useState<ListenStatus>("idle");
  const [speed, setSpeed] = useState<number>(1);

  const modeRef = useRef<"audio" | "speech" | null>(null);
  const transcriptRef = useRef<string>("");
  const speedRef = useRef(1);
  const tokenRef = useRef(0);

  const hardStop = useCallback(() => {
    stopAudio();
    if (typeof window !== "undefined" && "speechSynthesis" in window) speechSynthesis.cancel();
    modeRef.current = null;
  }, []);

  const stop = useCallback(() => {
    tokenRef.current++;
    hardStop();
    setStatus("idle");
    setActiveId(null);
  }, [hardStop]);

  const speakBrowser = useCallback((id: string, transcript: string) => {
    modeRef.current = "speech";
    setStatus("playing");
    const token = tokenRef.current;
    speakDialogueBrowser(
      transcript,
      () => {
        if (tokenRef.current === token) {
          setStatus("idle");
          setActiveId(null);
        }
      },
      speedRef.current
    );
  }, []);

  const play = useCallback(
    async (id: string, transcript: string) => {
      if (!transcript) return;
      unlockAudio();
      hardStop();
      const token = ++tokenRef.current;
      transcriptRef.current = transcript;
      setActiveId(id);
      setStatus("loading");
      try {
        const url = await fetchTts(transcript, true);
        if (tokenRef.current !== token) return;
        const a = getAudioEl();
        a.onended = () => {
          if (tokenRef.current === token) {
            setStatus("idle");
            setActiveId(null);
          }
        };
        a.src = url;
        a.currentTime = 0;
        a.playbackRate = speedRef.current;
        modeRef.current = "audio";
        await a.play();
        if (tokenRef.current === token) setStatus("playing");
      } catch {
        if (tokenRef.current === token) speakBrowser(id, transcript);
      }
    },
    [hardStop, speakBrowser]
  );

  const pause = useCallback(() => {
    if (modeRef.current === "audio") {
      getAudioEl().pause();
      setStatus("paused");
    } else if (modeRef.current === "speech" && "speechSynthesis" in window) {
      speechSynthesis.pause();
      setStatus("paused");
    }
  }, []);

  const resume = useCallback(() => {
    if (modeRef.current === "audio") {
      getAudioEl().play().catch(() => {});
      setStatus("playing");
    } else if (modeRef.current === "speech" && "speechSynthesis" in window) {
      speechSynthesis.resume();
      setStatus("playing");
    }
  }, []);

  // Cambia la velocidad. En audio es instantáneo; en la voz del navegador
  // re-inicia la lectura a la nueva velocidad (no permite cambiarla en vuelo).
  const cycleSpeed = useCallback(() => {
    const next = SPEEDS[(SPEEDS.indexOf(speedRef.current as (typeof SPEEDS)[number]) + 1) % SPEEDS.length];
    speedRef.current = next;
    setSpeed(next);
    if (modeRef.current === "audio") {
      getAudioEl().playbackRate = next;
    } else if (modeRef.current === "speech" && activeId) {
      speakBrowser(activeId, transcriptRef.current);
    }
  }, [activeId, speakBrowser]);

  // Detener al desmontar (cambiar de sección/página).
  useEffect(() => () => stop(), [stop]);

  return { activeId, status, speed, play, pause, resume, stop, cycleSpeed };
}
