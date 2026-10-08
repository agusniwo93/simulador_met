import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { ADMIN_COOKIE, hasAdminSession } from "@/lib/auth/admin-session";
import { createDiscountCode, listDiscountCodes } from "@/lib/db";
import { basePrice } from "@/lib/pay/discount";
import { isAllowedPercent } from "@/lib/pay/price";

// Códigos de descuento: listar y generar. Solo admin.

const schema = z.object({
  percent: z.number().refine(isAllowedPercent),
  maxUses: z.number().int().min(1).max(10000),
  note: z.string().trim().max(80).optional(),
});

async function requireAdmin(): Promise<boolean> {
  const store = await cookies();
  return hasAdminSession(store.get(ADMIN_COOKIE)?.value);
}

export async function GET() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  return NextResponse.json({ codes: listDiscountCodes(), price: basePrice() });
}

export async function POST(req: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "badRequest" }, { status: 400 });
  return NextResponse.json({ code: createDiscountCode(parsed.data) });
}
