import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ADMIN_COOKIE, hasAdminSession } from "@/lib/auth/admin-session";
import { deleteExamResult } from "@/lib/db";

// Elimina un resultado (alumno que rindió el examen). Solo admin.
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const store = await cookies();
  if (!(await hasAdminSession(store.get(ADMIN_COOKIE)?.value))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const ok = deleteExamResult(id);
  return NextResponse.json({ ok });
}
