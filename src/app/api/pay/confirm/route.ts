import { NextResponse } from "next/server";
import { captureOrder } from "@/lib/pay/paypal";
import { ACCESS_COOKIE, signAccessPass, accessCookieOptions } from "@/lib/auth/access";

function baseUrl(req: Request): string {
  return process.env.NEXT_PUBLIC_BASE_URL || new URL(req.url).origin;
}

// PayPal redirige aquí tras la aprobación (?token=ORDER_ID). Captura la orden y,
// solo si queda COMPLETED, emite el pase de acceso. No hay modo demo.
export async function GET(req: Request) {
  const base = baseUrl(req);
  const orderId = new URL(req.url).searchParams.get("token");

  if (!orderId) {
    return NextResponse.redirect(`${base}/?pay=failed`);
  }

  let paid = false;
  try {
    paid = await captureOrder(orderId);
  } catch {
    paid = false;
  }

  if (!paid) {
    return NextResponse.redirect(`${base}/?pay=failed`);
  }

  const pass = await signAccessPass();
  const res = NextResponse.redirect(`${base}/exam`);
  res.cookies.set(ACCESS_COOKIE, pass, accessCookieOptions);
  return res;
}
