import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { getExam, createExamResult } from "@/lib/db";
import { gradeExam, type AnswerMap } from "@/lib/exam/grade";
import { ACCESS_COOKIE, hasValidAccess } from "@/lib/auth/access";

const schema = z.object({
  examId: z.string(),
  studentName: z.string().min(1),
  lang: z.enum(["en", "es"]),
  answers: z.record(z.string(), z.union([z.string(), z.number(), z.null()])),
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

  const { examId, studentName, lang, answers, autoSubmitted } = parsed.data;
  const exam = getExam(examId);
  if (!exam) return NextResponse.json({ error: "no_exam" }, { status: 404 });

  const { sectionResults, overallScore } = await gradeExam(exam, answers as AnswerMap, lang);

  const result = createExamResult({
    examId,
    studentName,
    lang,
    sectionResults,
    overallScore,
    submittedAt: new Date().toISOString(),
    autoSubmitted: autoSubmitted ?? false,
  });

  return NextResponse.json({ resultId: result.id });
}
