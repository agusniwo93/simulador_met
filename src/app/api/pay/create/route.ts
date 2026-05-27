import { NextResponse } from "next/server";
import Stripe from "stripe";

function baseUrl(req: Request): string {
  return process.env.NEXT_PUBLIC_BASE_URL || new URL(req.url).origin;
}

// Crea una sesión de Stripe Checkout (incluye pago con tarjeta y con Link).
// SIN clave => el pago no está configurado y NO se concede acceso.
export async function POST(req: Request) {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    return NextResponse.json({ error: "not_configured" }, { status: 503 });
  }

  const base = baseUrl(req);
  const amount = Math.round(Number(process.env.PAY_AMOUNT || 15) * 100);
  const currency = (process.env.PAY_CURRENCY || "usd").toLowerCase();

  try {
    const stripe = new Stripe(key);
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency,
            product_data: { name: "Acceso ExamBridge MET — Examen completo" },
            unit_amount: amount,
          },
          quantity: 1,
        },
      ],
      // Stripe ofrece Link automáticamente cuando está habilitado en la cuenta.
      success_url: `${base}/api/pay/confirm?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${base}/?pay=failed`,
    });
    if (!session.url) return NextResponse.json({ error: "stripe_error" }, { status: 500 });
    return NextResponse.json({ url: session.url });
  } catch {
    return NextResponse.json({ error: "stripe_error" }, { status: 500 });
  }
}
