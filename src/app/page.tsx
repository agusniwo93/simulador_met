import { cookies } from "next/headers";
import LandingClient from "@/components/landing/LandingClient";
import { ACCESS_COOKIE, hasValidAccess } from "@/lib/auth/access";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ pay?: string }>;
}) {
  const store = await cookies();
  const sp = await searchParams;

  // El acceso al examen se otorga ÚNICAMENTE tras un pago verificado en
  // /api/pay/confirm. `?pay=1` solo abre el formulario de pago (no da acceso);
  // `?pay=failed` muestra el aviso de pago fallido.
  const hasAccess = await hasValidAccess(store.get(ACCESS_COOKIE)?.value);

  return (
    <LandingClient
      hasAccess={hasAccess}
      autoPay={sp.pay === "1"}
      payFailed={sp.pay === "failed"}
    />
  );
}
