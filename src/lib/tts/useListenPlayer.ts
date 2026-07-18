"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  fetchTts,
  getAudioEl,
  speakDialogueBrowser,
  stopAudio,
  unlockAudio,
} from "@/lib/tts/player";

export type ListenStatus = "idle" | "loading" | "playing" | "paused";

// Controla la reproduccion del listening con pausa/reanudar/stop a velocidad normal.
export function useListenPlayer() {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [status, setStatus] = useState<ListenStatus>("idle");

  const modeRef = useRef<"audio" | "speech" | null>(null);
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
    speakDialogueBrowser(transcript, () => {
      if (tokenRef.current === token) {
        setStatus("idle");
        setActiveId(null);
      }
    });
  }, []);

  const play = useCallback(
    async (id: string, transcript: string) => {
      if (!transcript) return;
      unlockAudio();
      hardStop();
      const token = ++tokenRef.current;
      setActiveId(id);
      setStatus("loading");
      try {
        const url = await fetchTts(transcript, true);
        if (tokenRef.current !== token) return;
        const audio = getAudioEl();
        audio.onended = () => {
          if (tokenRef.current === token) {
            setStatus("idle");
            setActiveId(null);
          }
        };
        audio.src = url;
        audio.currentTime = 0;
        audio.playbackRate = 1;
        modeRef.current = "audio";
        await audio.play();
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

  useEffect(() => () => stop(), [stop]);

  return { activeId, status, play, pause, resume, stop };
}
