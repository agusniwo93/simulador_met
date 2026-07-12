import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { cookies } from "next/headers";
import { ADMIN_COOKIE, hasAdminSession } from "@/lib/auth/admin-session";
import { createExam, UPLOAD_DIR } from "@/lib/db";
import { extractPdfText, parseExam } from "@/lib/exam/pdf-template";

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

  // Se acepta la plantilla como .txt (se lee directo) o como PDF (se extrae el texto).
  const isTxt = (file.name || "").toLowerCase().endsWith(".txt") || file.type === "text/plain";

  let text = "";
  try {
    text = isTxt ? buffer.toString("utf-8") : await extractPdfText(buffer);
  } catch {
    return NextResponse.json({ error: "parseError" }, { status: 422 });
  }

  const { title, sections } = parseExam(text);
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
