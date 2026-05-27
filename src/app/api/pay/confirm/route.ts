import { NextResponse } from "next/server";
import { ACCESS_COOKIE, signAccessPass, accessCookieOptions } from "@/lib/auth/access";

function baseUrl(req: Request): string {
  return process.env.NEXT_PUBLIC_BASE_URL || new URL(req.url).origin;
}

// Mercado Pago redirige aquí tras el pago. Verifica y emite el pase de acceso.
export async function GET(req: Request) {
  const base = baseUrl(req);
  const url = new URL(req.url);
  const isDemo = url.searchParams.get("demo") === "1";
  const token = process.env.MERCADOPAGO_ACCESS_TOKEN;

  let approved = isDemo;

  if (!isDemo && token) {
    const paymentId = url.searchParams.get("payment_id") || url.searchParams.get("collection_id");
    const status = url.searchParams.get("status") || url.searchParams.get("collection_status");
    if (paymentId) {
      // Verificación robusta consultando el pago en Mercado Pago.
      try {
        const res = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const payment = await res.json();
        approved = payment.status === "approved";
      } catch {
        approved = status === "approved";
      }
    } else {
      approved = status === "approved";
    }
  }

  if (!approved) return NextResponse.redirect(`${base}/?pay=failed`);

  const pass = await signAccessPass();
  const res = NextResponse.redirect(`${base}/exam`);
  res.cookies.set(ACCESS_COOKIE, pass, accessCookieOptions);
  return res;
}
