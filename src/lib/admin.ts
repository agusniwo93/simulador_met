import { timingSafeEqual } from "crypto";

// Verificación del código de administrador (solo en el endpoint de login, runtime Node).

export function getAdminCode(): string {
  const code = process.env.ADMIN_CODE;
  if (!code) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("ADMIN_CODE no está definido. Configúralo en el entorno de producción.");
    }
    return "met-admin-2026"; // solo desarrollo
  }
  return code;
}

// Comparación en tiempo constante para evitar fuga por timing.
export function verifyAdminCode(input: string): boolean {
  const expected = getAdminCode();
  const a = Buffer.from(input);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

// ---- Límite de intentos por IP (anti fuerza bruta, en memoria) ----
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 10 * 60 * 1000; // 10 minutos
const attempts = new Map<string, { count: number; first: number }>();

export function isRateLimited(ip: string): boolean {
  const rec = attempts.get(ip);
  if (!rec) return false;
  if (Date.now() - rec.first > WINDOW_MS) {
    attempts.delete(ip);
    return false;
  }
  return rec.count >= MAX_ATTEMPTS;
}

export function registerFailedAttempt(ip: string): void {
  const rec = attempts.get(ip);
  if (!rec || Date.now() - rec.first > WINDOW_MS) {
    attempts.set(ip, { count: 1, first: Date.now() });
  } else {
    rec.count += 1;
  }
}

export function clearAttempts(ip: string): void {
  attempts.delete(ip);
}
