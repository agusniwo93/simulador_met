import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ACCESS_COOKIE, signAccessPass, accessCookieOptions } from "@/lib/auth/access";

async function handleAccessRedirect(req: Request) {
  const forwardedHost = req.headers.get("x-forwarded-host");
  const forwardedProto = req.headers.get("x-forwarded-proto") || "https";
  const referer = req.headers.get("referer");

  let origin = "";
  if (referer) {
    origin = new URL(referer).origin;
  } else if (forwardedHost) {
    origin = `${forwardedProto}://${forwardedHost}`;
  } else {
    origin = new URL(req.url).origin;
  }

  try {
    const pass = await signAccessPass();
    const res = NextResponse.redirect(`${origin}/exam`, { status: 303 });
    
    // Aquí Next.js te deja escribir la cookie de forma 100% nativa y segura
    res.cookies.set(ACCESS_COOKIE, pass, accessCookieOptions);
    return res;
  } catch (error) {
    console.error("Error al procesar acceso:", error);
    return NextResponse.redirect(`${origin}/?pay=failed`, { status: 303 });
  }
}

// Soporte para el redireccionamiento desde la Landing Page (?pay=1)
export async function GET(req: Request) {
  return handleAccessRedirect(req);
}

// Soporte para la notificación original post-pago por detrás de IziPay
export async function POST(req: Request) {
  return handleAccessRedirect(req);
}
