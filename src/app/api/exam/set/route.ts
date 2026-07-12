import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { buildShuffledExam, getRandomExam, getExamConfig } from "@/lib/db";
import { ACCESS_COOKIE, hasValidAccess } from "@/lib/auth/access";
import type { Exam } from "@/lib/types";

// Quita correctIndex antes de enviar al cliente (la corrección es en el servidor).
function stripAnswers(exam: Exam): Exam {
  return {
    ...exam,
    sections: exam.sections.map((s) => ({
      ...s,
      items: s.items?.map((it) => ({ ...it, correctIndex: -1 })),
      passages: s.passages?.map((p) => ({
        ...p,
        items: p.items.map((it) => ({ ...it, correctIndex: -1 })),
      })),
    })),
  };
}

export async function GET() {
  const store = await cookies();
  if (!(await hasValidAccess(store.get(ACCESS_COOKIE)?.value))) {
    return NextResponse.json({ error: "payment_required" }, { status: 402 });
  }
  const config = getExamConfig();
  // Chocolatear activo → mezcla y baraja; desactivado → un examen tal cual se subió.
  const exam = config.shuffle ? buildShuffledExam() : getRandomExam();
  if (!exam) return NextResponse.json({ error: "no_exams" }, { status: 404 });
  return NextResponse.json({ exam: stripAnswers(exam), config });
}
