import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { UPLOAD_DIR } from "@/lib/db";

// Sirve imágenes subidas por el admin desde /data/uploads (público: el alumno
// debe poder verlas dentro del examen). Los pasajes sembrados usan /public/seed.
const CONTENT_TYPES: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
};

export async function GET(_req: Request, { params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;

  // Anti path-traversal: solo el nombre de archivo, sin separadores.
  const safe = path.basename(name);
  if (safe !== name || safe.includes("..")) {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }

  const ext = path.extname(safe).toLowerCase();
  const type = CONTENT_TYPES[ext];
  if (!type) return NextResponse.json({ error: "unsupported" }, { status: 400 });

  const filePath = path.join(UPLOAD_DIR, safe);
  if (!fs.existsSync(filePath)) {
    return NextResponse.json({ error: "notFound" }, { status: 404 });
  }

  const data = fs.readFileSync(filePath);
  return new NextResponse(new Uint8Array(data), {
    headers: {
      "Content-Type": type,
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
