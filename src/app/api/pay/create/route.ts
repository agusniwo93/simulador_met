import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { randomUUID } from "crypto";
import { z } from "zod";
import { izipayConfigured, createPaymentForm } from "@/lib/pay/izipay";
import { cancelPendingOrder, reserveCodeOrder } from "@/lib/db";
import {
  HOLD_COOKIE,
  basePrice,
  clientIp,
  isCodeRateLimited,
  registerFailedCodeAttempt,
  validHolder,
} from "@/lib/pay/discount";

const schema = z.object({ code: z.string().max(40).optional() });

export async function POST(req: Request) {
  // Orden con código ya reservada, para liberarla si IziPay no crea el pago.
  let reservedOrderId: string | null = null;

  try {
    // 1. Verificamos que tus variables del .env existan
    if (!izipayConfigured()) {
      console.error("IziPay no está configurado en el .env");
      return NextResponse.json({ error: "not_configured" }, { status: 500 });
    }

    // Un cuerpo vacío es un pago normal; un `code` mal formado se rechaza para
    // no cobrar el precio completo a quien creía tener un descuento aplicado.
    const parsed = schema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json({ error: "code_invalid" }, { status: 400 });
    }
    const codeInput = parsed.data.code?.trim();

    const store = await cookies();
    const holder = validHolder(store.get(HOLD_COOKIE)?.value) ?? randomUUID();

    // 2. Generamos un código de orden único para este alumno
    const orderId = `MET-${Date.now()}-${randomUUID().slice(0, 8)}`;

    // 3. El precio lo decide SIEMPRE el servidor: base del .env menos el
    //    descuento del código (si trae uno válido).
    const { amount: base, currency } = basePrice();
    let amount = base;
    if (codeInput) {
      const ip = clientIp(req);
      if (isCodeRateLimited(ip)) {
        return NextResponse.json({ error: "rate_limited" }, { status: 429 });
      }
      // Reserva un uso del código hasta que el pago se confirme o caduque.
      const reserved = reserveCodeOrder({ orderId, code: codeInput, holder, base, currency });
      if (!reserved.ok) {
        if (reserved.reason === "invalid") registerFailedCodeAttempt(ip);
        return NextResponse.json(
          { error: `code_${reserved.reason}` },
          { status: reserved.reason === "busy" ? 409 : 400 }
        );
      }
      amount = reserved.amount;
      reservedOrderId = orderId;
    }

    // IziPay pide un correo, ponemos uno genérico ya que tu sistema no usa cuentas
    const email = "alumno@simulador-met.com";

    // 4. Llamamos a tu motor de IziPay para generar el pase mágico
    const formToken = await createPaymentForm({
      amount,
      currency,
      orderId,
      email,
    });

    // 5. Enviamos la llave pública y el token a la pantalla (LandingClient),
    //    junto con el monto que realmente se va a cobrar.
    const publicKey = process.env.IZIPAY_PUBLIC_KEY;

    const res = NextResponse.json({ formToken, publicKey, amount, currency });
    res.cookies.set(HOLD_COOKIE, holder, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24,
    });
    return res;
  } catch (error: unknown) {
    if (reservedOrderId) {
      try {
        cancelPendingOrder(reservedOrderId);
      } catch (e) {
        console.error("No se pudo liberar la reserva del código:", e);
      }
    }
    console.error("Error al crear pago IziPay:", error);
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
