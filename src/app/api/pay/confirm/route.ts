import { NextResponse } from "next/server";
import { ACCESS_COOKIE, signAccessPass, accessCookieOptions } from "@/lib/auth/access";

function baseUrl(req: Request): string {
  return process.env.NEXT_PUBLIC_BASE_URL || new URL(req.url).origin;
}

// Redirección inmediata al examen tras la confirmación de pago de IziPay
export async function POST(req: Request) {
  const base = baseUrl(req);

  try {
    // 1. Generar el pase de acceso para el alumno
    const pass = await signAccessPass();

    // 2. Redirigir de inmediato a la pantalla del examen
    // Se utiliza status 303 para asegurar el cambio limpio de POST a GET en el navegador
    const res = NextResponse.redirect(`${base}/exam`, { status: 303 });
    
    // 3. Inyectar la cookie de acceso de forma segura
    res.cookies.set(ACCESS_COOKIE, pass, accessCookieOptions);

    return res;
    
  } catch (error) {
    console.error("Error al procesar el éxito de IziPay:", error);
    return NextResponse.redirect(`${base}/?pay=failed`, { status: 303 });
  }
}
