import { NextResponse } from "next/server";
import { z } from "zod";
import {
  verifyAdminCode,
  isRateLimited,
  registerFailedAttempt,
  clearAttempts,
} from "@/lib/auth/admin";
import { ADMIN_COOKIE, signAdminSession, adminCookieOptions } from "@/lib/auth/admin-session";

const schema = z.object({ code: z.string().min(1).max(200) });

function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  return fwd ? fwd.split(",")[0].trim() : "unknown";
}

export async function POST(req: Request) {
  const ip = clientIp(req);
  if (isRateLimited(ip)) {
    return NextResponse.json({ error: "rateLimited" }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success || !verifyAdminCode(parsed.data.code)) {
    registerFailedAttempt(ip);
    return NextResponse.json({ error: "invalid" }, { status: 401 });
  }

  clearAttempts(ip);
  const token = await signAdminSession();
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, token, adminCookieOptions);
  return res;
}
