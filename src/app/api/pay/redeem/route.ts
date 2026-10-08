import { NextResponse } from "next/server";
import { z } from "zod";
import { ACCESS_COOKIE, signAccessPass, accessCookieOptions } from "@/lib/auth/access";
import { redeemFreeCode } from "@/lib/db";
import { clientIp, isCodeRateLimited, registerFailedCodeAttempt } from "@/lib/pay/discount";

// Canjea un código 100% gratis: gasta un uso y otorga el pase de acceso sin
// pasar por IziPay. Es la única vía de entrar sin pagar, por eso lleva límite
// de intentos por IP.

const schema = z.object({ code: z.string().min(1).max(40) });

export async function POST(req: Request) {
  const ip = clientIp(req);
  if (isCodeRateLimited(ip)) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  const parsed = schema.safeParse(await req.json().catch(() => null));
  // El pase se firma ANTES de gastar el uso: si fallara, el código queda intacto.
  const pass = parsed.success ? await signAccessPass() : null;
  if (!parsed.success || !pass || !redeemFreeCode(parsed.data.code)) {
    registerFailedCodeAttempt(ip);
    return NextResponse.json({ error: "code_invalid" }, { status: 400 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(ACCESS_COOKIE, pass, accessCookieOptions);
  return res;
}
