import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { getExam, createExamResult, finishPass, getExamResult, getPassRecord } from "@/lib/db";
import { gradeExam, type AnswerMap } from "@/lib/exam/grade";
import { ACCESS_COOKIE, accessCookieOptions, readAccessPass } from "@/lib/auth/access";

const schema = z.object({
  examId: z.string(),
  studentName: z.string().min(1),
  lang: z.enum(["en", "es"]),
  answers: z.record(z.string(), z.union([z.string(), z.number(), z.null()])),
  autoSubmitted: z.boolean().optional(),
});

// Responde con el resultado y retira el pase del navegador: ya está gastado.
function delivered(resultId: string) {
  const res = NextResponse.json({ resultId });
  res.cookies.set(ACCESS_COOKIE, "", { ...accessCookieOptions, maxAge: 0 });
  return res;
}

export async function POST(req: Request) {
  const store = await cookies();
  const pass = await readAccessPass(store.get(ACCESS_COOKIE)?.value);
  if (!pass) {
    return NextResponse.json({ error: "payment_required" }, { status: 402 });
  }

  // Cada pase vale por UN examen. Si este ya se entregó (p. ej. el envío se
  // repite porque se perdió la respuesta), se devuelve el mismo resultado sin
  // corregir ni guardar otro.
  const record = getPassRecord(pass.id);
  if (record?.resultId) {
    if (getExamResult(record.resultId)) return delivered(record.resultId);
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

  // Examen entregado → el pase queda gastado.
  finishPass(pass.id, examId, result.id);
  return delivered(result.id);
}
