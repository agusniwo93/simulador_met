// Reproductor de audio TTS en el cliente. Usa UN elemento <audio> compartido y
// lo "desbloquea" dentro de un gesto del usuario (iOS/Safari lo exigen para
// poder reproducir por código después de un fetch asíncrono). Cachea los blobs
// por texto para no re-pedirlos.

let sharedAudio: HTMLAudioElement | null = null;
let unlocked = false;
const cache = new Map<string, string>(); // texto → objectURL

function getAudio(): HTMLAudioElement {
  if (!sharedAudio) sharedAudio = new Audio();
  return sharedAudio;
}

// WAV silencioso generado en memoria (evita depender de un base64 externo).
function silentWavUrl(): string {
  const sampleRate = 8000;
  const samples = 800; // ~0.1 s
  const buffer = new ArrayBuffer(44 + samples);
  const view = new DataView(buffer);
  const w = (o: number, s: string) => {
    for (let i = 0; i < s.length; i++) view.setUint8(o + i, s.charCodeAt(i));
  };
  w(0, "RIFF");
  view.setUint32(4, 36 + samples, true);
  w(8, "WAVE");
  w(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate, true);
  view.setUint16(32, 1, true);
  view.setUint16(34, 8, true); // 8-bit
  w(36, "data");
  view.setUint32(40, samples, true);
  for (let i = 0; i < samples; i++) view.setUint8(44 + i, 128); // silencio
  return URL.createObjectURL(new Blob([buffer], { type: "audio/wav" }));
}

// Llamar DENTRO de un gesto del usuario (clic) para habilitar la reproducción.
export function unlockAudio(): void {
  if (unlocked || typeof window === "undefined") return;
  try {
    const a = getAudio();
    a.src = silentWavUrl();
    const p = a.play();
    if (p && typeof p.then === "function") {
      p.then(() => {
        unlocked = true;
        try {
          a.pause();
          a.currentTime = 0;
        } catch {
          /* ignore */
        }
      }).catch(() => {
        /* si falla, se intentará al reproducir de verdad */
      });
    }
  } catch {
    /* ignore */
  }
}

export function stopAudio(): void {
  try {
    const a = getAudio();
    a.pause();
    a.currentTime = 0;
  } catch {
    /* ignore */
  }
}

// Genera (servidor) y reproduce el audio del texto. Resuelve al terminar la
// reproducción. Lanza si el servidor no puede generar (para caer al fallback).
export async function playTTS(text: string, opts?: { dialogue?: boolean }): Promise<void> {
  const dialogue = opts?.dialogue !== false;
  const key = (dialogue ? "d:" : "s:") + text;
  let url = cache.get(key);
  if (!url) {
    const res = await fetch("/api/exam/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, dialogue }),
    });
    if (!res.ok) throw new Error(`tts ${res.status}`);
    const blob = await res.blob();
    url = URL.createObjectURL(blob);
    cache.set(key, url);
  }

  const a = getAudio();
  return new Promise<void>((resolve, reject) => {
    a.onended = () => resolve();
    a.onerror = () => reject(new Error("audio playback error"));
    a.src = url as string;
    a.currentTime = 0;
    const p = a.play();
    if (p && typeof p.catch === "function") p.catch(reject);
  });
}
