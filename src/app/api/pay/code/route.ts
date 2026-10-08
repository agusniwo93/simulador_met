import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { checkDiscountCode } from "@/lib/db";
import {
  HOLD_COOKIE,
  basePrice,
  clientIp,
  isCodeRateLimited,
  registerFailedCodeAttempt,
  validHolder,
} from "@/lib/pay/discount";
import { discountedAmount } from "@/lib/pay/price";

// Comprueba un código de descuento y devuelve el precio que se cobraría.
// Solo informa: el uso se gasta al confirmarse el pago (o al canjear, si es gratis).

const schema = z.object({ code: z.string().min(1).max(40) });

export async function POST(req: Request) {
  const ip = clientIp(req);
  if (isCodeRateLimited(ip)) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    registerFailedCodeAttempt(ip);
    return NextResponse.json({ error: "code_invalid" }, { status: 400 });
  }

  // Con la cookie del navegador, su propio pago en curso no le bloquea el código.
  const holder = validHolder((await cookies()).get(HOLD_COOKIE)?.value);
  const check = checkDiscountCode(parsed.data.code, holder);
  if (!check.ok) {
    // "busy" es un código real cuyos usos están en pagos en curso: no es un
    // intento de adivinar, así que no cuenta para el límite.
    if (check.reason === "invalid") registerFailedCodeAttempt(ip);
    return NextResponse.json(
      { error: `code_${check.reason}` },
      { status: check.reason === "busy" ? 409 : 400 }
    );
  }

  const { code } = check;
  const { amount: base, currency } = basePrice();
  return NextResponse.json({
    code: code.code,
    percent: code.percent,
    amount: discountedAmount(base, code.percent),
    currency,
    free: code.percent === 100,
  });
}
