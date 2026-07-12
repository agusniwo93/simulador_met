// Reproductor de audio TTS en el cliente. Usa UN elemento <audio> compartido y
// lo "desbloquea" dentro de un gesto del usuario (iOS/Safari lo exigen para
// poder reproducir por código después de un fetch asíncrono). Cachea los blobs
// por texto para no re-pedirlos.

import { parseDialogue } from "@/lib/exam/dialogue";

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

// Elemento <audio> compartido (para controles: pausa/reanudar/velocidad).
export function getAudioEl(): HTMLAudioElement {
  return getAudio();
}

// Pide (servidor) el audio del texto y devuelve su objectURL, con caché.
export async function fetchTts(text: string, dialogue = true): Promise<string> {
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
  return url;
}

// Genera (servidor) y reproduce el audio del texto. Resuelve al terminar la
// reproducción. Lanza si el servidor no puede generar (para caer al fallback).
export async function playTTS(text: string, opts?: { dialogue?: boolean }): Promise<void> {
  const url = await fetchTts(text, opts?.dialogue !== false);
  const a = getAudio();
  return new Promise<void>((resolve, reject) => {
    a.onended = () => resolve();
    a.onerror = () => reject(new Error("audio playback error"));
    a.src = url;
    a.currentTime = 0;
    const p = a.play();
    if (p && typeof p.catch === "function") p.catch(reject);
  });
}

// ---------- Voz del navegador con dos voces (respaldo de ElevenLabs) ----------

let voices: { female: SpeechSynthesisVoice | null; male: SpeechSynthesisVoice | null } | null = null;

function loadVoices(): void {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  const femaleHint = /(female|woman|samantha|victoria|karen|moira|tessa|fiona|zira|susan|allison|ava|serena|kate|catherine|nicky|joana|paulina|google us english)/i;
  const maleHint = /(\bmale\b|\bman\b|daniel|alex|fred|aaron|david|mark|oliver|thomas|arthur|george|\bguy\b|rishi|\btom\b|james|reed|rocko)/i;
  const en = speechSynthesis.getVoices().filter((v) => /^en/i.test(v.lang));
  const list = en.length ? en : speechSynthesis.getVoices();
  if (!list.length) return;
  const female = list.find((v) => femaleHint.test(v.name)) ?? list[0];
  const male =
    list.find((v) => maleHint.test(v.name) && v.name !== female.name) ??
    list.find((v) => v.name !== female.name) ??
    female;
  voices = { female, male };
}

if (typeof window !== "undefined" && "speechSynthesis" in window) {
  loadVoices();
  speechSynthesis.addEventListener("voiceschanged", loadVoices);
}

// Lee un guion como conversación con la voz del navegador: distinta voz (y tono)
// para mujer/hombre según "Woman:"/"Man:", SIN pronunciar la etiqueta.
export function speakDialogueBrowser(transcript: string, onEnd?: () => void, speed = 1): void {
  if (typeof window === "undefined" || !("speechSynthesis" in window) || !transcript) {
    onEnd?.();
    return;
  }
  try {
    speechSynthesis.cancel();
    if (!voices) loadVoices();
    const segs = parseDialogue(transcript);
    const last = segs.length - 1;
    segs.forEach((seg, i) => {
      const u = new SpeechSynthesisUtterance(seg.text);
      u.lang = "en-US";
      u.rate = 0.95 * speed;
      const v = seg.speaker === "male" ? voices?.male : voices?.female ?? voices?.male;
      if (v) u.voice = v;
      u.pitch = seg.speaker === "male" ? 0.8 : seg.speaker === "female" ? 1.15 : 1;
      if (i === last && onEnd) u.onend = onEnd;
      speechSynthesis.speak(u);
    });
  } catch {
    onEnd?.();
  }
}

// Reproduce el listening con ElevenLabs (dos voces) y, si no está disponible,
// cae a la voz del navegador con dos voces. Llamar dentro de un gesto (clic).
export function speakDialogue(transcript: string, onEnd?: () => void): void {
  if (!transcript) {
    onEnd?.();
    return;
  }
  unlockAudio();
  stopAudio();
  if (typeof window !== "undefined" && "speechSynthesis" in window) speechSynthesis.cancel();
  playTTS(transcript, { dialogue: true })
    .then(() => onEnd?.())
    .catch(() => speakDialogueBrowser(transcript, onEnd));
}
