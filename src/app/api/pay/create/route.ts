import { NextResponse } from "next/server";

function baseUrl(req: Request): string {
  return process.env.NEXT_PUBLIC_BASE_URL || new URL(req.url).origin;
}

// Crea la preferencia de pago de Mercado Pago (Checkout Pro).
// Sin MERCADOPAGO_ACCESS_TOKEN => modo DEMO (pago simulado).
export async function POST(req: Request) {
  const base = baseUrl(req);
  const token = process.env.MERCADOPAGO_ACCESS_TOKEN;
  const amount = Number(process.env.PAY_AMOUNT || 15);
  const currency = process.env.PAY_CURRENCY || "USD";

  if (!token) {
    return NextResponse.json({ url: `${base}/api/pay/confirm?demo=1`, demo: true });
  }

  try {
    const res = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        items: [
          {
            title: "Acceso ExamBridge MET — Simulacro de Writing",
            quantity: 1,
            unit_price: amount,
            currency_id: currency,
          },
        ],
        back_urls: {
          success: `${base}/api/pay/confirm`,
          failure: `${base}/?pay=failed`,
          pending: `${base}/?pay=pending`,
        },
        auto_return: "approved",
      }),
    });
    const data = await res.json();
    const url = data.init_point || data.sandbox_init_point;
    if (url) return NextResponse.json({ url });
    return NextResponse.json({ error: "mp_error" }, { status: 500 });
  } catch {
    return NextResponse.json({ error: "mp_error" }, { status: 500 });
  }
}
