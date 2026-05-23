import { NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin";
import { listQuestionSets } from "@/lib/db";

export async function GET(req: Request) {
  if (!isAdminRequest(req)) return NextResponse.json({ error: "forbidden" }, { status: 401 });
  return NextResponse.json({ sets: listQuestionSets() });
}
