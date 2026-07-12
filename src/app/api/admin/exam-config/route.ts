import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ADMIN_COOKIE, hasAdminSession } from "@/lib/auth/admin-session";
import { getExamConfig, saveExamConfig } from "@/lib/db";
import type { SectionKind, ExamConfig } from "@/lib/types";

async function requireAdmin(): Promise<boolean> {
  const store = await cookies();
  return hasAdminSession(store.get(ADMIN_COOKIE)?.value);
}

const KINDS: SectionKind[] = ["writing", "listening", "grammar", "reading", "speaking"];

export async function GET() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  return NextResponse.json({ config: getExamConfig() });
}

export async function PUT(req: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const body = (await req.json().catch(() => null)) as Partial<ExamConfig> | null;
  if (!body) return NextResponse.json({ error: "badRequest" }, { status: 400 });

  const patch: Partial<ExamConfig> = {};

  if (body.sectionMinutes && typeof body.sectionMinutes === "object") {
    const sm: Partial<Record<SectionKind, number>> = {};
    for (const k of KINDS) {
      const v = body.sectionMinutes[k];
      if (typeof v === "number" && Number.isFinite(v)) {
        sm[k] = Math.max(0, Math.min(300, Math.round(v))); // 0..300 min
      }
    }
    patch.sectionMinutes = sm as Record<SectionKind, number>;
  }
  if (typeof body.allowListeningReplay === "boolean") {
    patch.allowListeningReplay = body.allowListeningReplay;
  }
  if (typeof body.shuffle === "boolean") {
    patch.shuffle = body.shuffle;
  }

  return NextResponse.json({ config: saveExamConfig(patch) });
}
