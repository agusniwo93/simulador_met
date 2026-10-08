import { randomInt } from "crypto";
import { CHARGE_CURRENCY } from "./izipay";

// Códigos de descuento: utilidades del servidor (sin acceso a la base de datos).

// Precio base del acceso (sin descuento). La moneda es la que realmente cobra
// IziPay, para que lo que se muestra coincida siempre con lo que se cobra.
export function basePrice(): { amount: number; currency: string } {
  return {
    amount: Number(process.env.PAY_AMOUNT) || 15,
    currency: CHARGE_CURRENCY,
  };
}

// Sin caracteres ambiguos (0/O, 1/I/L) para que se pueda dictar o copiar a mano.
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

// Código al azar con formato MET-XXXX-XXXX.
export function generateCode(): string {
  const block = () =>
    Array.from({ length: 4 }, () => ALPHABET[randomInt(ALPHABET.length)]).join("");
  return `MET-${block()}-${block()}`;
}

// Forma de comparación de un código: solo letras y números, en mayúsculas. Así
// vale igual escrito en minúsculas, con espacios o sin los guiones.
export function canonicalCode(input: string): string {
  return input.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

// ---- Navegador que inicia un pago ----
// Cookie que identifica al navegador, para que la reserva que hace su propio
// pago en curso no le bloquee el código al recargar la página o reintentar.
export const HOLD_COOKIE = "met_hold";

// La cookie la controla el cliente: solo se acepta con forma de UUID.
export function validHolder(value: string | undefined): string | undefined {
  return value && /^[0-9a-f-]{36}$/.test(value) ? value : undefined;
}

// ---- Límite de intentos por IP (anti fuerza bruta de códigos, en memoria) ----
const MAX_ATTEMPTS = 8;
const WINDOW_MS = 10 * 60 * 1000; // 10 minutos
const MAX_TRACKED_IPS = 5000;
const attempts = new Map<string, { count: number; first: number }>();

export function isCodeRateLimited(ip: string): boolean {
  const rec = attempts.get(ip);
  if (!rec) return false;
  if (Date.now() - rec.first > WINDOW_MS) {
    attempts.delete(ip);
    return false;
  }
  return rec.count >= MAX_ATTEMPTS;
}

export function registerFailedCodeAttempt(ip: string): void {
  const now = Date.now();
  // Evita que el mapa crezca sin límite si llegan intentos desde muchas IP.
  if (attempts.size >= MAX_TRACKED_IPS) {
    for (const [key, rec] of attempts) {
      if (now - rec.first > WINDOW_MS) attempts.delete(key);
    }
    if (attempts.size >= MAX_TRACKED_IPS) attempts.clear();
  }
  const rec = attempts.get(ip);
  if (!rec || now - rec.first > WINDOW_MS) {
    attempts.set(ip, { count: 1, first: now });
  } else {
    rec.count += 1;
  }
}

// IP del cliente detrás de Nginx. `X-Real-IP` lo fija Nginx con la dirección
// real de la conexión; de `X-Forwarded-For` solo es fiable el último valor (el
// que añade Nginx): los anteriores los puede inventar el propio cliente.
export function clientIp(req: Request): string {
  const real = req.headers.get("x-real-ip")?.trim();
  if (real) return real;
  const last = req.headers.get("x-forwarded-for")?.split(",").pop()?.trim();
  return last || "unknown";
}
