import { cookies } from "next/headers";
import LandingClient from "@/components/LandingClient";
import { ACCESS_COOKIE, hasValidAccess } from "@/lib/access";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ pay?: string }>;
}) {
  const store = await cookies();
  const hasAccess = await hasValidAccess(store.get(ACCESS_COOKIE)?.value);
  const sp = await searchParams;
  return (
    <LandingClient hasAccess={hasAccess} autoPay={sp.pay === "1"} payFailed={sp.pay === "failed"} />
  );
}
