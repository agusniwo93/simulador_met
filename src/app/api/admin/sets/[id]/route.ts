import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ADMIN_COOKIE, hasAdminSession } from "@/lib/auth/admin-session";
import { deleteExam, getExam, updateExam } from "@/lib/db";
import type { Section } from "@/lib/types";

async function requireAdmin(): Promise<boolean> {
  const store = await cookies();
  return hasAdminSession(store.get(ADMIN_COOKIE)?.value);
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const exam = getExam(id);
  if (!exam) return NextResponse.json({ error: "notFound" }, { status: 404 });
  return NextResponse.json({ exam });
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { id } = await params;

  const body = (await req.json().catch(() => null)) as {
    title?: unknown;
    durationMinutes?: unknown;
    sections?: unknown;
  } | null;
  if (!body) return NextResponse.json({ error: "badRequest" }, { status: 400 });

  const patch: { title?: string; durationMinutes?: number; sections?: Section[] } = {};

  if (typeof body.title === "string" && body.title.trim()) patch.title = body.title.trim();

  if (typeof body.durationMinutes === "number" && Number.isFinite(body.durationMinutes)) {
    patch.durationMinutes = Math.max(1, Math.round(body.durationMinutes));
  }

  if (Array.isArray(body.sections)) {
    // Validación estructural mínima.
    const ok = body.sections.every(
      (s) => s && typeof s === "object" && typeof (s as Section).kind === "string"
    );
    if (!ok) return NextResponse.json({ error: "invalidSections" }, { status: 400 });
    patch.sections = body.sections as Section[];
  }

  const exam = updateExam(id, patch);
  if (!exam) return NextResponse.json({ error: "notFound" }, { status: 404 });
  return NextResponse.json({ exam });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const ok = deleteExam(id);
  return NextResponse.json({ ok });
}
