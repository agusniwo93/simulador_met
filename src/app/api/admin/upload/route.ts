import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { cookies } from "next/headers";
import { ADMIN_COOKIE, hasAdminSession } from "@/lib/auth/admin-session";
import { createExam, UPLOAD_DIR } from "@/lib/db";
import { extractPdfText, parseTemplate } from "@/lib/exam/pdf-template";

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

  let text = "";
  try {
    text = await extractPdfText(buffer);
  } catch {
    return NextResponse.json({ error: "parseError" }, { status: 422 });
  }

  const { title, tasks } = parseTemplate(text);
  if (tasks.length === 0) {
    return NextResponse.json({ error: "parseError" }, { status: 422 });
  }

  const safeName = `${Date.now()}-${(file.name || "set.pdf").replace(/[^\w.-]/g, "_")}`;
  fs.writeFileSync(path.join(UPLOAD_DIR, safeName), buffer);

  const exam = createExam({
    title: customTitle || title,
    durationMinutes: 45,
    sourceFile: safeName,
    sections: [{ kind: "writing", title: "Writing", writingTasks: tasks }],
  });

  return NextResponse.json({ exam, parsedCount: tasks.length });
}
