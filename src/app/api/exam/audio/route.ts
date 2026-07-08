import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { cookies } from "next/headers";
import { ACCESS_COOKIE, hasValidAccess } from "@/lib/auth/access";
import { UPLOAD_DIR } from "@/lib/db";

// Extensión por tipo MIME de audio (MediaRecorder suele producir webm/ogg/mp4).
const ALLOWED: Record<string, string> = {
  "audio/webm": ".webm",
  "audio/ogg": ".ogg",
  "audio/mp4": ".mp4",
  "audio/mpeg": ".mp3",
  "audio/wav": ".wav",
};

const MAX_BYTES = 15 * 1024 * 1024; // 15 MB por grabación

// Sube la grabación de voz de una tarea de Speaking. Requiere pase de acceso.
export async function POST(req: Request) {
  const store = await cookies();
  if (!(await hasValidAccess(store.get(ACCESS_COOKIE)?.value))) {
    return NextResponse.json({ error: "payment_required" }, { status: 402 });
  }

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!file || typeof file === "string") {
    return NextResponse.json({ error: "noFile" }, { status: 400 });
  }

  // Algunos navegadores incluyen codecs en el type (audio/webm;codecs=opus).
  const baseType = (file.type || "").split(";")[0].trim();
  const ext = ALLOWED[baseType] ?? ".webm";

  const buffer = Buffer.from(await file.arrayBuffer());
  if (buffer.byteLength > MAX_BYTES) {
    return NextResponse.json({ error: "tooLarge" }, { status: 413 });
  }

  if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  const name = `audio-${Date.now()}-${randomUUID().slice(0, 8)}${ext}`;
  fs.writeFileSync(path.join(UPLOAD_DIR, name), buffer);

  return NextResponse.json({ url: `/api/media/${name}` });
}
