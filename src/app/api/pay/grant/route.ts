import { NextResponse } from "next/server";
import { ACCESS_COOKIE, signAccessPass, accessCookieOptions } from "@/lib/auth/access";

// Otorga el pase de acceso y redirige al examen.
// Debe vivir en un Route Handler: las cookies NO pueden modificarse desde un
// Server Component (Next.js lo prohíbe en producción / Render).
export async function GET(req: Request) {
  // Detrás del proxy de Render, reconstruimos el origen público real para no
  // redirigir a localhost:10000.
  const forwardedHost = req.headers.get("x-forwarded-host");
  const forwardedProto = req.headers.get("x-forwarded-proto") || "https";
  const referer = req.headers.get("referer");

  let origin = "";
  if (forwardedHost) {
    origin = `${forwardedProto}://${forwardedHost}`;
  } else if (referer) {
    origin = new URL(referer).origin;
  } else {
    origin = new URL(req.url).origin; // Respaldo local
  }

  // Salvavidas para el ACCESS_SECRET en producción.
  if (!process.env.ACCESS_SECRET) {
    process.env.ACCESS_SECRET = "clave_secreta_de_emergencia_para_la_exposicion_2026";
  }

  try {
    const pass = await signAccessPass();
    const res = NextResponse.redirect(`${origin}/exam`, { status: 303 });
    res.cookies.set(ACCESS_COOKIE, pass, accessCookieOptions);
    return res;
  } catch (error) {
    console.error("Error al otorgar el pase de acceso:", error);
    return NextResponse.redirect(`${origin}/?pay=failed`, { status: 303 });
  }
}
