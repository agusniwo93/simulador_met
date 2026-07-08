import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { cookies } from "next/headers";
import { ADMIN_COOKIE, hasAdminSession } from "@/lib/auth/admin-session";
import { UPLOAD_DIR } from "@/lib/db";

const ALLOWED: Record<string, string> = {
  "image/png": ".png",
  "image/jpeg": ".jpeg",
  "image/webp": ".webp",
  "image/gif": ".gif",
};

const MAX_BYTES = 8 * 1024 * 1024; // 8 MB

// Sube una imagen de pasaje (Reading) y devuelve su URL servible.
export async function POST(req: Request) {
  const store = await cookies();
  if (!(await hasAdminSession(store.get(ADMIN_COOKIE)?.value))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!file || typeof file === "string") {
    return NextResponse.json({ error: "noFile" }, { status: 400 });
  }

  const ext = ALLOWED[file.type];
  if (!ext) {
    return NextResponse.json({ error: "unsupportedType" }, { status: 415 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  if (buffer.byteLength > MAX_BYTES) {
    return NextResponse.json({ error: "tooLarge" }, { status: 413 });
  }

  if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  const name = `img-${Date.now()}-${randomUUID().slice(0, 8)}${ext}`;
  fs.writeFileSync(path.join(UPLOAD_DIR, name), buffer);

  return NextResponse.json({ url: `/api/media/${name}` });
}
