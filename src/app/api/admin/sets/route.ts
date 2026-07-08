import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ADMIN_COOKIE, hasAdminSession } from "@/lib/auth/admin-session";
import { listExams, createExam } from "@/lib/db";
import type { Section } from "@/lib/types";

async function requireAdmin(): Promise<boolean> {
  const store = await cookies();
  return hasAdminSession(store.get(ADMIN_COOKIE)?.value);
}

export async function GET() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  return NextResponse.json({ exams: listExams() });
}

// Andamiaje: examen nuevo con las 5 secciones vacías, listo para editar.
function blankSections(): Section[] {
  return [
    { kind: "writing", title: "Writing", writingTasks: [] },
    { kind: "listening", title: "Listening", items: [] },
    { kind: "grammar", title: "Grammar", items: [] },
    { kind: "reading", title: "Reading", passages: [] },
    { kind: "speaking", title: "Speaking", speakingTasks: [] },
  ];
}

export async function POST(req: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const body = (await req.json().catch(() => null)) as { title?: unknown } | null;
  const title =
    body && typeof body.title === "string" && body.title.trim() ? body.title.trim() : "Nuevo examen";

  const exam = createExam({
    title,
    durationMinutes: 45,
    sections: blankSections(),
  });
  return NextResponse.json({ exam });
}
