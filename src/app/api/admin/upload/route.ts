import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { isAdminRequest } from "@/lib/admin";
import { createQuestionSet, UPLOAD_DIR } from "@/lib/db";
import { extractPdfText, parseTemplate } from "@/lib/pdf-template";

export async function POST(req: Request) {
  if (!isAdminRequest(req)) return NextResponse.json({ error: "forbidden" }, { status: 401 });

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

  const set = createQuestionSet({
    title: customTitle || title,
    sourceFile: safeName,
    tasks,
  });

  return NextResponse.json({ set, parsedCount: tasks.length });
}
