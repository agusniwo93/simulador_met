import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { cookies } from "next/headers";
import { ACCESS_COOKIE } from "@/lib/auth/access";
import { usableAccessPass } from "@/lib/auth/pass";
import { UPLOAD_DIR } from "@/lib/db";
import { AUDIO_EXT, sniffAudioType } from "@/lib/media";

const MAX_BYTES = 15 * 1024 * 1024; // 15 MB por grabación

// Deja constancia en el log del servidor (pm2 logs) de por qué se rechazó una
// grabación, con el navegador que la envió, para diagnosticar fallos de un equipo.
function rejected(req: Request, reason: string, status: number, detail: Record<string, unknown> = {}) {
  const browser = (req.headers.get("user-agent") ?? "").slice(0, 160);
  console.warn(`[audio] grabación rechazada (${reason})`, { ...detail, browser });
  return NextResponse.json({ error: reason }, { status });
}

// Sube la grabación de voz de una tarea de Speaking. Requiere pase de acceso.
export async function POST(req: Request) {
  const store = await cookies();
  if (!(await usableAccessPass(store.get(ACCESS_COOKIE)?.value))) {
    return rejected(req, "payment_required", 402);
  }

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!file || typeof file === "string") {
    return rejected(req, "noFile", 400);
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  if (buffer.byteLength > MAX_BYTES) {
    return rejected(req, "tooLarge", 413, { bytes: buffer.byteLength });
  }
  // Una grabación vacía o casi vacía no se puede escuchar: se rechaza para que
  // el alumno vuelva a grabar en vez de guardar un audio inservible.
  if (buffer.byteLength < 256) {
    return rejected(req, "empty", 400, { bytes: buffer.byteLength, type: file.type });
  }

  // La extensión sale del contenido real; el tipo declarado por el navegador
  // (que puede incluir codecs, p. ej. audio/webm;codecs=opus) queda de respaldo.
  const declared = (file.type || "").split(";")[0].trim();
  const type = sniffAudioType(buffer.subarray(0, 16)) ?? declared;
  const ext = AUDIO_EXT[type] ?? ".webm";

  if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  const name = `audio-${Date.now()}-${randomUUID().slice(0, 8)}${ext}`;
  fs.writeFileSync(path.join(UPLOAD_DIR, name), buffer);

  return NextResponse.json({ url: `/api/media/${name}` });
}
