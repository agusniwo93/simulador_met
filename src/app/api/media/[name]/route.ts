import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { UPLOAD_DIR } from "@/lib/db";
import { parseRange, sniffAudioType } from "@/lib/media";

// Sirve imágenes subidas por el admin desde /data/uploads (público: el alumno
// debe poder verlas dentro del examen) y las grabaciones de Speaking. Los
// pasajes sembrados usan /public/seed.
const CONTENT_TYPES: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  // Audio (grabaciones de Speaking)
  ".webm": "audio/webm",
  ".ogg": "audio/ogg",
  ".mp4": "audio/mp4",
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
};

export async function GET(req: Request, { params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;

  // Anti path-traversal: solo el nombre de archivo, sin separadores.
  const safe = path.basename(name);
  if (safe !== name || safe.includes("..")) {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }

  const ext = path.extname(safe).toLowerCase();
  let type = CONTENT_TYPES[ext];
  if (!type) return NextResponse.json({ error: "unsupported" }, { status: 400 });

  const filePath = path.join(UPLOAD_DIR, safe);
  if (!fs.existsSync(filePath)) {
    return NextResponse.json({ error: "notFound" }, { status: 404 });
  }

  const data = fs.readFileSync(filePath);
  const isAudio = type.startsWith("audio/");
  // Las grabaciones se sirven con su tipo real (por si se guardaron con una
  // extensión que no corresponde al contenido).
  if (isAudio) type = sniffAudioType(data.subarray(0, 16)) ?? type;

  const headers: Record<string, string> = {
    "Content-Type": type,
    "Accept-Ranges": "bytes",
    "Cache-Control": isAudio ? "private, max-age=86400" : "public, max-age=31536000, immutable",
  };

  // Reproductores de audio (Safari en especial) piden el archivo por tramos.
  const range = parseRange(req.headers.get("range"), data.length);
  if (range === "unsatisfiable") {
    return new NextResponse(null, {
      status: 416,
      headers: { ...headers, "Content-Range": `bytes */${data.length}` },
    });
  }
  if (range) {
    const chunk = data.subarray(range.start, range.end + 1);
    return new NextResponse(new Uint8Array(chunk), {
      status: 206,
      headers: {
        ...headers,
        "Content-Range": `bytes ${range.start}-${range.end}/${data.length}`,
        "Content-Length": String(chunk.length),
      },
    });
  }

  return new NextResponse(new Uint8Array(data), {
    headers: { ...headers, "Content-Length": String(data.length) },
  });
}
