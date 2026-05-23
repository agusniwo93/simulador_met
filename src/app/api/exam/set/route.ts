import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getRandomQuestionSet } from "@/lib/db";
import { ACCESS_COOKIE, hasValidAccess } from "@/lib/access";

export async function GET() {
  const store = await cookies();
  if (!(await hasValidAccess(store.get(ACCESS_COOKIE)?.value))) {
    return NextResponse.json({ error: "payment_required" }, { status: 402 });
  }
  const set = getRandomQuestionSet();
  if (!set) return NextResponse.json({ error: "no_sets" }, { status: 404 });
  return NextResponse.json({ set });
}
