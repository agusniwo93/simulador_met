import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { cookies } from "next/headers";
import { ADMIN_COOKIE, hasAdminSession } from "@/lib/auth/admin-session";
import { createExam, UPLOAD_DIR } from "@/lib/db";
import {
  extractPdfText,
  extractPdfImages,
  extractDocx,
  parseExam,
  type ImagesByPage,
} from "@/lib/exam/pdf-template";

export async function POST(req: Request) {
  const store = await cookies();
  if (!(await hasAdminSession(store.get(ADMIN_COOKIE)?.value))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  const customTitle = (form?.get("title") as string | null)?.trim();

  if (!file || typeof file === "string") {
    return NextResponse.json({ error: "noFile" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  // Se acepta .txt (directo), .docx (Word) o PDF.
  const fname = (file.name || "").toLowerCase();
  const isTxt = fname.endsWith(".txt") || file.type === "text/plain";
  const isDocx =
    fname.endsWith(".docx") ||
    file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

  let text = "";
  const imagesByPage: ImagesByPage = {};
  try {
    if (isTxt) {
      text = buffer.toString("utf-8");
    } else if (isDocx) {
      // .docx CON imágenes: se extraen los anuncios de Reading y la foto de
      // Speaking, se guardan (comprimidas a WebP) y se inyectan como marcadores
      // @@IMG:url@@ en su posición para que el parser las asocie.
      if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
      const { text: docxText, images } = await extractDocx(buffer);
      let sharp: ((input: Buffer) => import("sharp").Sharp) | null = null;
      try {
        sharp = (await import("sharp")).default as unknown as (input: Buffer) => import("sharp").Sharp;
      } catch {
        sharp = null;
      }
      const urls: string[] = [];
      for (let i = 0; i < images.length; i++) {
        let outBuf = images[i].buffer;
        let ext = images[i].ext;
        if (sharp) {
          try {
            outBuf = await sharp(images[i].buffer)
              .resize({ width: 1200, withoutEnlargement: true })
              .webp({ quality: 82 })
              .toBuffer();
            ext = "webp";
          } catch {
            /* si falla la compresión, se guarda el original */
          }
        }
        const name = `img-${Date.now()}-${randomUUID().slice(0, 8)}.${ext}`;
        fs.writeFileSync(path.join(UPLOAD_DIR, name), outBuf);
        urls.push(`/api/media/${name}`);
      }
      text = docxText;
      urls.forEach((u, i) => {
        text = text.split(`@@IMGREF${i}@@`).join(`@@IMG:${u}@@`);
      });
    } else {
      text = await extractPdfText(buffer);
      // Extraemos las imágenes del PDF (anuncios de Reading, foto de Speaking) y
      // las guardamos como archivos servibles, agrupadas por página.
      if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
      const images = await extractPdfImages(buffer).catch(() => []);
      for (const img of images) {
        const name = `img-${Date.now()}-${randomUUID().slice(0, 8)}.${img.ext}`;
        fs.writeFileSync(path.join(UPLOAD_DIR, name), img.buffer);
        (imagesByPage[img.page] ||= []).push(`/api/media/${name}`);
      }
    }
  } catch {
    return NextResponse.json({ error: "parseError" }, { status: 422 });
  }

  const { title, sections } = parseExam(text, imagesByPage);
  if (sections.length === 0) {
    return NextResponse.json({ error: "parseError" }, { status: 422 });
  }

  const safeName = `${Date.now()}-${(file.name || "set.pdf").replace(/[^\w.-]/g, "_")}`;
  fs.writeFileSync(path.join(UPLOAD_DIR, safeName), buffer);

  const exam = createExam({
    title: customTitle || title,
    durationMinutes: 90,
    sourceFile: safeName,
    sections,
  });

  // Nº de preguntas/tareas reconocidas (para el mensaje de éxito del admin).
  const parsedCount = sections.reduce(
    (n, s) =>
      n +
      (s.writingTasks?.length ?? 0) +
      (s.items?.length ?? 0) +
      (s.speakingTasks?.length ?? 0) +
      (s.passages?.reduce((a, p) => a + p.items.length, 0) ?? 0),
    0
  );

  return NextResponse.json({ exam, parsedCount });
}
