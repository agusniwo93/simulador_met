import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ADMIN_COOKIE, hasAdminSession } from "@/lib/auth/admin-session";
import { getAnalytics } from "@/lib/db";

export async function GET() {
  const store = await cookies();
  if (!(await hasAdminSession(store.get(ADMIN_COOKIE)?.value))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  return NextResponse.json({ analytics: getAnalytics() });
}
