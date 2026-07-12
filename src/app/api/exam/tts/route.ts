import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ACCESS_COOKIE, hasValidAccess } from "@/lib/auth/access";
import { ADMIN_COOKIE, hasAdminSession } from "@/lib/auth/admin-session";
import { ttsConfigured, synthesize } from "@/lib/tts/elevenlabs";

// Genera el audio (ElevenLabs) del listening/speaking. Requiere pase de acceso
// (alumno que pagó) o sesión de admin (para la vista previa), para no exponer
// los créditos de la API a cualquiera.
export async function POST(req: Request) {
  const store = await cookies();
  const paid = await hasValidAccess(store.get(ACCESS_COOKIE)?.value);
  const admin = await hasAdminSession(store.get(ADMIN_COOKIE)?.value);
  if (!paid && !admin) {
    return NextResponse.json({ error: "payment_required" }, { status: 402 });
  }
  if (!ttsConfigured()) {
    return NextResponse.json({ error: "tts_not_configured" }, { status: 503 });
  }

  const body = (await req.json().catch(() => null)) as { text?: string; dialogue?: boolean } | null;
  const text = body?.text?.trim();
  if (!text) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  if (text.length > 5000) {
    return NextResponse.json({ error: "too_long" }, { status: 413 });
  }

  try {
    const audio = await synthesize(text, body?.dialogue !== false);
    return new NextResponse(new Uint8Array(audio), {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "private, max-age=86400",
      },
    });
  } catch (e) {
    console.error("TTS error:", e);
    return NextResponse.json({ error: "tts_failed" }, { status: 502 });
  }
}
