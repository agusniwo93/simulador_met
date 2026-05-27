import { NextResponse } from "next/server";
import { paypalConfigured, createOrder } from "@/lib/pay/paypal";

function baseUrl(req: Request): string {
  return process.env.NEXT_PUBLIC_BASE_URL || new URL(req.url).origin;
}

// Crea una orden de PayPal y devuelve la URL de aprobación.
// SIN credenciales => el pago no está configurado y NO se concede acceso.
export async function POST(req: Request) {
  if (!paypalConfigured()) {
    return NextResponse.json({ error: "not_configured" }, { status: 503 });
  }

  const base = baseUrl(req);
  const amount = Number(process.env.PAY_AMOUNT || 15).toFixed(2);
  const currency = (process.env.PAY_CURRENCY || "USD").toUpperCase();

  try {
    const url = await createOrder({
      amount,
      currency,
      returnUrl: `${base}/api/pay/confirm`,
      cancelUrl: `${base}/?pay=failed`,
    });
    return NextResponse.json({ url });
  } catch {
    return NextResponse.json({ error: "paypal_error" }, { status: 500 });
  }
}
