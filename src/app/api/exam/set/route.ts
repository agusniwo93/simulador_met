import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getRandomExam, getExamConfig, listExams } from "@/lib/db";
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
  // Chocolatear entre EXÁMENES: cada alumno recibe un examen completo al azar
  // (distinto entre alumnos), sin mezclar preguntas de distintos exámenes.
  // Desactivado → el mismo examen fijo para todos (el primero subido).
  const exam = config.shuffle ? getRandomExam() : listExams()[0];
  if (!exam) return NextResponse.json({ error: "no_exams" }, { status: 404 });
  return NextResponse.json({ exam: stripAnswers(exam), config });
}
