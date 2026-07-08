import { NextResponse } from "next/server";
import { ACCESS_COOKIE, signAccessPass, accessCookieOptions } from "@/lib/auth/access";

export async function POST(req: Request) {
  // 1. OBTENER EL DOMINIO PÚBLICO REAL DETRÁS DEL PROXY DE RENDER
  // Extraemos la URL real de procedencia para evitar el redireccionamiento erróneo a localhost:10000
  const forwardedHost = req.headers.get("x-forwarded-host");
  const forwardedProto = req.headers.get("x-forwarded-proto") || "https";
  const referer = req.headers.get("referer");

  let origin = "";
  if (referer) {
    origin = new URL(referer).origin; // Ej: https://met-plataforma.onrender.com
  } else if (forwardedHost) {
    origin = `${forwardedProto}://${forwardedHost}`;
  } else {
    origin = new URL(req.url).origin; // Respaldo local
  }

  // Salvavidas para el ACCESS_SECRET en producción
  if (!process.env.ACCESS_SECRET) {
    process.env.ACCESS_SECRET = "clave_secreta_de_emergencia_para_la_exposicion_2026";
  }

  try {
    // 2. Generar el pase de acceso para el examen
    const pass = await signAccessPass();

    // 3. Redirigir de inmediato usando el origen público real detectado
    const res = NextResponse.redirect(`${origin}/exam`, { status: 303 });
    
    // 4. Inyectar la cookie de acceso de forma segura en el navegador
    res.cookies.set(ACCESS_COOKIE, pass, accessCookieOptions);

    return res;
    
  } catch (error) {
    console.error("Error al procesar el éxito de IziPay:", error);
    return NextResponse.redirect(`${origin}/?pay=failed`, { status: 303 });
  }
}
