import { NextResponse, type NextRequest } from "next/server";
import { ACCESS_COOKIE, hasValidAccess } from "@/lib/access";
import { ADMIN_COOKIE, hasAdminSession } from "@/lib/admin-session";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // ---- Panel y API de administración ----
  if (pathname.startsWith("/admin") || pathname.startsWith("/api/admin")) {
    // El login es público (es donde se obtiene la sesión).
    if (pathname === "/admin/login" || pathname === "/api/admin/login") {
      return NextResponse.next();
    }
    const isAdmin = await hasAdminSession(req.cookies.get(ADMIN_COOKIE)?.value);
    if (!isAdmin) {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json({ error: "unauthorized" }, { status: 401 });
      }
      return NextResponse.redirect(new URL("/admin/login", req.url));
    }
    return NextResponse.next();
  }

  // ---- Examen: requiere pase de acceso (pago) ----
  if (pathname.startsWith("/exam")) {
    const ok = await hasValidAccess(req.cookies.get(ACCESS_COOKIE)?.value);
    if (!ok) {
      const url = new URL("/", req.url);
      url.searchParams.set("pay", "1");
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*", "/exam/:path*"],
};
