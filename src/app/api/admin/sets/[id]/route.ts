import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ADMIN_COOKIE, hasAdminSession } from "@/lib/admin-session";
import { deleteQuestionSet } from "@/lib/db";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const store = await cookies();
  if (!(await hasAdminSession(store.get(ADMIN_COOKIE)?.value))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const ok = deleteQuestionSet(id);
  return NextResponse.json({ ok });
}
