import { NextResponse } from "next/server";
import Stripe from "stripe";
import { ACCESS_COOKIE, signAccessPass, accessCookieOptions } from "@/lib/auth/access";

function baseUrl(req: Request): string {
  return process.env.NEXT_PUBLIC_BASE_URL || new URL(req.url).origin;
}

// Stripe redirige aquí tras el checkout. Solo emite el pase si el pago está
// realmente confirmado (payment_status === "paid"). No hay modo demo.
export async function GET(req: Request) {
  const base = baseUrl(req);
  const key = process.env.STRIPE_SECRET_KEY;
  const sessionId = new URL(req.url).searchParams.get("session_id");

  if (!key || !sessionId) {
    return NextResponse.redirect(`${base}/?pay=failed`);
  }

  try {
    const stripe = new Stripe(key);
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (session.payment_status !== "paid") {
      return NextResponse.redirect(`${base}/?pay=failed`);
    }
  } catch {
    return NextResponse.redirect(`${base}/?pay=failed`);
  }

  const pass = await signAccessPass();
  const res = NextResponse.redirect(`${base}/exam`);
  res.cookies.set(ACCESS_COOKIE, pass, accessCookieOptions);
  return res;
}
