import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { ADMIN_COOKIE, hasAdminSession } from "@/lib/auth/admin-session";
import { deleteDiscountCode, setDiscountCodeActive } from "@/lib/db";

// Activar/desactivar o eliminar un código de descuento. Solo admin.

const schema = z.object({ active: z.boolean() });

async function requireAdmin(): Promise<boolean> {
  const store = await cookies();
  return hasAdminSession(store.get(ADMIN_COOKIE)?.value);
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "badRequest" }, { status: 400 });
  const { id } = await params;
  const code = setDiscountCodeActive(id, parsed.data.active);
  if (!code) return NextResponse.json({ error: "notFound" }, { status: 404 });
  return NextResponse.json({ code });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  return NextResponse.json({ ok: deleteDiscountCode(id) });
}
