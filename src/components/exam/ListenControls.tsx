"use client";

import type { useListenPlayer } from "@/lib/tts/useListenPlayer";

type Player = ReturnType<typeof useListenPlayer>;

// Barra de controles del listening: play / pausa-reanudar / stop.
export default function ListenControls({
  player,
  id,
  transcript,
  labels,
  played = false,
  allowReplay = true,
  onPlay,
}: {
  player: Player;
  id: string;
  transcript: string;
  labels: { listen: string; playing: string; loading: string; played?: string };
  played?: boolean;
  allowReplay?: boolean;
  onPlay?: () => void;
}) {
  const active = player.activeId === id;
  const { status } = player;

  const pill =
    "inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-cyan-500 to-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-[0_8px_24px_-10px_rgba(99,102,241,0.7)] transition hover:brightness-110 active:scale-95";
  const iconBtn =
    "flex h-8 w-8 items-center justify-center rounded-full bg-white/15 text-white transition hover:bg-white/25 active:scale-95";

  if (!active) {
    if (played && !allowReplay) {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-4 py-2 text-xs font-bold text-slate-400">
          <span aria-hidden>✓</span> {labels.played ?? "Played"}
        </span>
      );
    }
    return (
      <button
        onClick={() => {
          onPlay?.();
          player.play(id, transcript);
        }}
        className={pill}
      >
        <span aria-hidden>▶</span> {labels.listen}
      </button>
    );
  }

  return (
    <div className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-cyan-500 to-indigo-600 px-2 py-1.5 shadow-[0_8px_24px_-10px_rgba(99,102,241,0.7)]">
      {status === "loading" ? (
        <span className="flex items-center gap-2 px-2 text-xs font-bold text-white">
          <span className="h-3.5 w-3.5 rounded-full border-2 border-white/40 border-t-white animate-spin" />
          {labels.loading}
        </span>
      ) : status === "paused" ? (
        <button onClick={player.resume} className={iconBtn} aria-label="Play" title={labels.playing}>
          ▶
        </button>
      ) : (
        <button onClick={player.pause} className={iconBtn} aria-label="Pause">
          ⏸
        </button>
      )}

      <button onClick={player.stop} className={iconBtn} aria-label="Stop">
        ⏹
      </button>
    </div>
  );
}
