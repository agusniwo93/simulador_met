import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import LandingClient from "@/components/landing/LandingClient";
import { ACCESS_COOKIE, hasValidAccess } from "@/lib/auth/access";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ pay?: string }>;
}) {
  const store = await cookies();
  const sp = await searchParams;

  // Otorgar acceso tras el pago. La cookie NO puede fijarse desde un Server
  // Component (Next.js lo prohíbe: "Cookies can only be modified in a Server
  // Action or Route Handler"), así que delegamos en el Route Handler que sí
  // puede hacerlo y luego redirige al examen.
  if (sp.pay === "1") {
    redirect("/api/pay/grant");
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
