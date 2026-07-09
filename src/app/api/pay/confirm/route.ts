import { NextResponse } from "next/server";
import crypto from "crypto";
import { ACCESS_COOKIE, signAccessPass, accessCookieOptions } from "@/lib/auth/access";

// IziPay (Krypton) reenvía el resultado del pago a esta ruta (kr-post-url-success).
// SEGURIDAD: verificamos la FIRMA HMAC-SHA256 y que el pago esté realmente PAGADO
// antes de otorgar acceso. Sin esto, cualquiera podría hacer POST aquí y entrar
// gratis, sin pasar por IziPay.

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
  let data: { orderStatus?: string };
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

  // 4. Pago verificado → otorgar el pase de acceso.
  try {
    const pass = await signAccessPass();
    const res = NextResponse.redirect(`${origin}/exam`, { status: 303 });
    res.cookies.set(ACCESS_COOKIE, pass, accessCookieOptions);
    return res;
  } catch (error) {
    console.error("Error al firmar el pase tras pago verificado:", error);
    return fail();
  }
}
