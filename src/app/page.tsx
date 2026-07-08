import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import LandingClient from "@/components/landing/LandingClient";
import { ACCESS_COOKIE, hasValidAccess, signAccessPass, accessCookieOptions } from "@/lib/auth/access";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ pay?: string }>;
}) {
  const store = await cookies();
  const sp = await searchParams;

  // 🔥 INTERCEPTOR SEGURO PARA LA EXPOSICIÓN
  if (sp.pay === "1") {
    // Si Render no tiene configurada la variable, inyectamos el fallback 
    // directamente en el hilo de ejecución antes de llamar a tu función.
    if (!process.env.ACCESS_SECRET) {
      Object.defineProperty(process.env, "ACCESS_SECRET", {
        value: "clave_secreta_de_emergencia_para_la_exposicion_2026",
        writable: true,
        enumerable: true,
        configurable: true
      });
    }
    
    // Llamamos a tu función original exactamente como fue diseñada (con 0 parámetros)
    const pass = await signAccessPass();
    
    // Guardamos la cookie de forma nativa respetando los tipos de Next.js
    store.set({
      name: ACCESS_COOKIE,
      value: pass,
      ...accessCookieOptions
    });
    
    // ¡Redirección forzada al simulador!
    redirect("/exam");
  }

  // Flujo normal de carga de la Landing
  const hasAccess = await hasValidAccess(store.get(ACCESS_COOKIE)?.value);

  return (
    <LandingClient 
      hasAccess={hasAccess} 
      autoPay={sp.pay === "1"} 
      payFailed={sp.pay === "failed"} 
    />
  );
}
