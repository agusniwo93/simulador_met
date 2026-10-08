import { cookies } from "next/headers";
import LandingClient from "@/components/landing/LandingClient";
import { ACCESS_COOKIE } from "@/lib/auth/access";
import { usableAccessPass } from "@/lib/auth/pass";
import { basePrice } from "@/lib/pay/discount";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ pay?: string }>;
}) {
  const store = await cookies();
  const sp = await searchParams;

  // El acceso al examen se otorga ÚNICAMENTE tras un pago verificado en
  // /api/pay/confirm. `?pay=1` solo abre el formulario de pago (no da acceso);
  // `?pay=failed` muestra el aviso de pago fallido. Cada pase vale por un
  // examen: una vez entregado ya no cuenta como acceso y se vuelve a ofrecer el pago.
  const hasAccess = (await usableAccessPass(store.get(ACCESS_COOKIE)?.value)) !== null;

  return (
    <LandingClient
      hasAccess={hasAccess}
      price={basePrice()}
      autoPay={sp.pay === "1"}
      payFailed={sp.pay === "failed"}
    />
  );
}
