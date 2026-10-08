import { NextResponse } from "next/server";
import crypto from "crypto";
import { ACCESS_COOKIE, signAccessPass, accessCookieOptions } from "@/lib/auth/access";
import { completeOrder } from "@/lib/db";

// IziPay (Krypton) reenvía el resultado del pago a esta ruta (kr-post-url-success).
// SEGURIDAD: verificamos la FIRMA HMAC-SHA256 y que el pago esté realmente PAGADO
// antes de otorgar acceso. Sin esto, cualquiera podría hacer POST aquí y entrar
// gratis, sin pasar por IziPay.
//
// Además, cada pago da acceso UNA sola vez: una confirmación válida guardada y
// vuelta a enviar más tarde (por el mismo alumno o por otra persona) no abre un
// pase nuevo. Sin esto, un único pago —p. ej. con un código de descuento de un
// solo uso— serviría para entrar indefinidamente.

// El acceso dura 24 horas desde la compra: una confirmación más antigua ya no vale.
const MAX_ANSWER_AGE_MS = 24 * 60 * 60 * 1000;
// Margen para un reenvío inmediato de la misma confirmación (doble envío del
// formulario): dentro de este plazo se vuelve a dar el pase sin registrar nada.
const REPEAT_GRACE_MS = 2 * 60 * 1000;

function getOrigin(req: Request): string {
  const forwardedHost = req.headers.get("x-forwarded-host");
  const forwardedProto = req.headers.get("x-forwarded-proto") || "https";
  const referer = req.headers.get("referer");
  if (forwardedHost) return `${forwardedProto}://${forwardedHost}`;
  if (referer) return new URL(referer).origin;
  return new URL(req.url).origin;
}

export async function POST(req: Request) {
  const origin = getOrigin(req);
  const fail = () => NextResponse.redirect(`${origin}/?pay=failed`, { status: 303 });

  // Clave HMAC-SHA256 de IziPay (panel → Claves de API REST → "Clave HMAC-SHA-256").
  const hmacKey = process.env.IZIPAY_HASH_KEY?.trim();
  if (!hmacKey) {
    console.error("IZIPAY_HASH_KEY no definido: no se puede verificar el pago.");
    return fail();
  }

  // 1. Cuerpo que envía IziPay (application/x-www-form-urlencoded).
  const params = new URLSearchParams(await req.text());
  const answer = params.get("kr-answer");
  const hash = params.get("kr-hash");
  if (!answer || !hash) {
    console.error("IziPay confirm: faltan kr-answer / kr-hash");
    return fail();
  }

  // 2. Verificar la firma: HMAC-SHA256(kr-answer, claveHMAC) === kr-hash.
  const expected = crypto.createHmac("sha256", hmacKey).update(answer).digest("hex");
  const valid =
    expected.length === hash.length &&
    crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(hash));
  if (!valid) {
    console.error(
      "IziPay confirm: firma inválida (posible fraude). kr-hash-key:",
      params.get("kr-hash-key")
    );
    return fail();
  }

  // 3. Verificar que el pago realmente se completó.
  let data: {
    orderStatus?: string;
    serverDate?: string;
    orderDetails?: { orderId?: string; orderTotalAmount?: number; orderCurrency?: string };
  };
  try {
    data = JSON.parse(answer);
  } catch {
    console.error("IziPay confirm: kr-answer no es JSON válido");
    return fail();
  }
  if (data.orderStatus !== "PAID") {
    console.error(`IziPay confirm: pago no PAGADO (orderStatus=${data.orderStatus})`);
    return fail();
  }

  // 4. Una confirmación de un pago antiguo (ya vencido) no da acceso de nuevo.
  const paidAt = data.serverDate ? Date.parse(data.serverDate) : NaN;
  if (Number.isFinite(paidAt) && Date.now() - paidAt > MAX_ANSWER_AGE_MS) {
    console.error(`IziPay confirm: confirmación antigua reenviada (serverDate=${data.serverDate})`);
    return fail();
  }

  // 5. Pago verificado → firmar el pase. Se firma ANTES de registrar el pago: si
  //    fallara, la orden queda sin registrar y la confirmación se puede reintentar.
  let pass: string;
  try {
    pass = await signAccessPass();
  } catch (error) {
    console.error("Error al firmar el pase tras pago verificado:", error);
    return fail();
  }

  // 6. Registrar el ingreso (monto realmente cobrado) y gastar el uso del código
  //    de descuento si lo hubo. Si esta orden ya se había confirmado antes, es un
  //    reenvío: solo se tolera dentro del margen de un doble envío.
  try {
    const details = data.orderDetails;
    const done = completeOrder(details?.orderId, {
      amount:
        typeof details?.orderTotalAmount === "number" ? details.orderTotalAmount / 100 : undefined,
      currency: details?.orderCurrency || undefined,
    });
    if (done.repeated && Date.now() - new Date(done.payment.at).getTime() > REPEAT_GRACE_MS) {
      console.error(`IziPay confirm: confirmación repetida de la orden ${details?.orderId}`);
      return fail();
    }
  } catch (e) {
    // No se bloquea a quien pagó por un fallo al guardar el registro.
    console.error("No se pudo registrar el pago (ingreso):", e);
  }

  const res = NextResponse.redirect(`${origin}/exam`, { status: 303 });
  res.cookies.set(ACCESS_COOKIE, pass, accessCookieOptions);
  return res;
}
