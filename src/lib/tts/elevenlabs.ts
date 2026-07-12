import fs from "fs";
import path from "path";
import crypto from "crypto";
import { parseDialogue, type DialogueSpeaker } from "@/lib/exam/dialogue";

// Text-to-Speech con ElevenLabs. Genera el audio en el servidor y lo cachea en
// disco (data/tts) para NO volver a pagar por el mismo texto. El contenido del
// examen es fijo, así que cada audio se genera una sola vez.

const API = "https://api.elevenlabs.io/v1/text-to-speech";
const CACHE_DIR = path.join(process.cwd(), "data", "tts");

// Voces por defecto (voces estándar disponibles en toda cuenta de ElevenLabs):
//   Rachel (mujer) y Adam (hombre). Configurables por entorno.
const DEFAULT_FEMALE = "21m00Tcm4TlvDq8ikWAM"; // Rachel
const DEFAULT_MALE = "pNInz6obpgDQGcFmaJgB"; // Adam

export function ttsConfigured(): boolean {
  return Boolean(process.env.ELEVENLABS_API_KEY);
}

function voiceFor(speaker: DialogueSpeaker): string {
  const female = process.env.ELEVENLABS_VOICE_FEMALE || DEFAULT_FEMALE;
  const male = process.env.ELEVENLABS_VOICE_MALE || DEFAULT_MALE;
  return speaker === "male" ? male : female; // narrator → voz femenina
}

function model(): string {
  return process.env.ELEVENLABS_MODEL || "eleven_multilingual_v2";
}

async function synthSegment(text: string, speaker: DialogueSpeaker): Promise<Buffer> {
  const res = await fetch(`${API}/${voiceFor(speaker)}`, {
    method: "POST",
    headers: {
      "xi-api-key": process.env.ELEVENLABS_API_KEY as string,
      "Content-Type": "application/json",
      Accept: "audio/mpeg",
    },
    body: JSON.stringify({
      text,
      model_id: model(),
      voice_settings: { stability: 0.5, similarity_boost: 0.75 },
    }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`ElevenLabs ${res.status}: ${detail.slice(0, 300)}`);
  }
  return Buffer.from(await res.arrayBuffer());
}

// Genera (o recupera de caché) el audio de un texto. Si `dialogue`, lo lee como
// conversación con dos voces; si no, con una sola voz (narrador).
export async function synthesize(text: string, dialogue: boolean): Promise<Buffer> {
  const segments = dialogue
    ? parseDialogue(text)
    : [{ speaker: "narrator" as DialogueSpeaker, text }];

  const key = crypto
    .createHash("sha256")
    .update(JSON.stringify({ segments, m: model(), f: voiceFor("female"), v: voiceFor("male") }))
    .digest("hex");
  const file = path.join(CACHE_DIR, `${key}.mp3`);

  try {
    if (fs.existsSync(file)) return fs.readFileSync(file);
  } catch {
    /* si falla la lectura de caché, se regenera */
  }

  const parts: Buffer[] = [];
  for (const seg of segments) {
    parts.push(await synthSegment(seg.text, seg.speaker));
  }
  const out = Buffer.concat(parts);

  try {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
    fs.writeFileSync(file, out);
  } catch {
    /* si no se puede cachear, igual devolvemos el audio */
  }
  return out;
}
