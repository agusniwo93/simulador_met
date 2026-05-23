import { NextResponse, type NextRequest } from "next/server";
import { ACCESS_COOKIE, hasValidAccess } from "@/lib/access";

// El examen requiere un pase de acceso válido (pago). Sin pase → a la landing con ?pay=1.
export async function middleware(req: NextRequest) {
  const ok = await hasValidAccess(req.cookies.get(ACCESS_COOKIE)?.value);
  if (!ok) {
    const url = new URL("/", req.url);
    url.searchParams.set("pay", "1");
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/exam/:path*"],
};
