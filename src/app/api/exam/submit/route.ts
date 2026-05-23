import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { getQuestionSet, createExamResult } from "@/lib/db";
import { gradeAnswer } from "@/lib/grammar";
import { ACCESS_COOKIE, hasValidAccess } from "@/lib/access";
import type { TaskGrade } from "@/lib/types";

const schema = z.object({
  questionSetId: z.string(),
  studentName: z.string().min(1),
  lang: z.enum(["en", "es"]),
  answers: z.record(z.string(), z.string()),
  autoSubmitted: z.boolean().optional(),
});

export async function POST(req: Request) {
  const store = await cookies();
  if (!(await hasValidAccess(store.get(ACCESS_COOKIE)?.value))) {
    return NextResponse.json({ error: "payment_required" }, { status: 402 });
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "invalid" }, { status: 400 });

  const { questionSetId, studentName, lang, answers, autoSubmitted } = parsed.data;
  const set = getQuestionSet(questionSetId);
  if (!set) return NextResponse.json({ error: "no_set" }, { status: 404 });

  // Corregir cada tarea (en paralelo) con LanguageTool.
  const grades: TaskGrade[] = await Promise.all(
    set.tasks.map((task) => gradeAnswer(task, answers[String(task.id)] ?? "", lang))
  );

  const overallScore = Math.round(grades.reduce((sum, g) => sum + g.score, 0) / (grades.length || 1));

  const result = createExamResult({
    questionSetId,
    studentName,
    lang,
    answers,
    grades,
    overallScore,
    submittedAt: new Date().toISOString(),
    autoSubmitted: autoSubmitted ?? false,
  });

  return NextResponse.json({ resultId: result.id });
}
