import { NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin";
import { deleteQuestionSet } from "@/lib/db";

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isAdminRequest(req)) return NextResponse.json({ error: "forbidden" }, { status: 401 });
  const { id } = await params;
  const ok = deleteQuestionSet(id);
  return NextResponse.json({ ok });
}
