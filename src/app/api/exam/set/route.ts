import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getExam, getExamConfig, getPassRecord, getRandomExam, listExams, startPassExam } from "@/lib/db";
import { ACCESS_COOKIE, readAccessPass } from "@/lib/auth/access";
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
  const pass = await readAccessPass(store.get(ACCESS_COOKIE)?.value);
  if (!pass) {
    return NextResponse.json({ error: "payment_required" }, { status: 402 });
  }

  // Cada pase vale por UN examen: si ya lo entregó, hay que pagar de nuevo.
  const record = getPassRecord(pass.id);
  if (record?.resultId) {
    return NextResponse.json({ error: "payment_required" }, { status: 402 });
  }

  const config = getExamConfig();
  // Si el pase ya empezó un examen se le devuelve el MISMO (aunque recargue o
  // borre los datos del navegador): un pase no sirve para ver varios exámenes.
  let exam = record ? getExam(record.examId) : undefined;
  if (!exam) {
    // Chocolatear entre EXÁMENES: cada alumno recibe un examen completo al azar
    // (distinto entre alumnos), sin mezclar preguntas de distintos exámenes.
    // Desactivado → el mismo examen fijo para todos (el primero subido).
    exam = config.shuffle ? getRandomExam() : listExams()[0];
    if (!exam) return NextResponse.json({ error: "no_exams" }, { status: 404 });
    startPassExam(pass.id, exam.id);
  }
  return NextResponse.json({ exam: stripAnswers(exam), config });
}
