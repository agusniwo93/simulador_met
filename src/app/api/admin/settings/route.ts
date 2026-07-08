import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ADMIN_COOKIE, hasAdminSession } from "@/lib/auth/admin-session";
import { getTheme, saveTheme } from "@/lib/db";
import { DEFAULT_THEME, type ThemeSettings } from "@/lib/types";

const HEX = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
const KEYS = Object.keys(DEFAULT_THEME) as (keyof ThemeSettings)[];

async function requireAdmin(): Promise<boolean> {
  const store = await cookies();
  return hasAdminSession(store.get(ADMIN_COOKIE)?.value);
}

export async function GET() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  return NextResponse.json({ theme: getTheme() });
}

export async function PUT(req: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: "badRequest" }, { status: 400 });

  const patch: Partial<ThemeSettings> = {};
  for (const key of KEYS) {
    const val = body[key];
    if (typeof val === "string") {
      if (!HEX.test(val)) {
        return NextResponse.json({ error: `invalidColor:${key}` }, { status: 400 });
      }
      patch[key] = val;
    }
  }

  const theme = saveTheme(patch);
  return NextResponse.json({ theme });
}
