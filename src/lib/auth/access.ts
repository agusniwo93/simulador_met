import { SignJWT, jwtVerify } from "jose";

// Pase de acceso (NO es una cuenta): se emite tras pagar (o canjear un código
// gratis) y permite rendir UN examen dentro de las 24 horas siguientes.
// Edge-safe (solo jose) para poder usarse en el middleware.

export const ACCESS_COOKIE = "met_access";
const MAX_AGE_SECONDS = 60 * 60 * 24; // 24 horas

// Clave de firma compartida (pase de acceso y sesión admin). Edge-safe.
export function getSigningKey(): Uint8Array {
  const secret = process.env.ACCESS_SECRET;
  if (!secret) {
    // En producción NO usamos un secreto por defecto: los tokens serían
    // falsificables (cualquiera entraría al examen sin pagar o al panel admin).
    if (process.env.NODE_ENV === "production") {
      throw new Error("ACCESS_SECRET no está definido. Configúralo en el entorno de producción.");
    }
    return new TextEncoder().encode("met-access-dev-secret-change-me");
  }
  return new TextEncoder().encode(secret);
}

export async function signAccessPass(): Promise<string> {
  return new SignJWT({ paid: true })
    .setProtectedHeader({ alg: "HS256" })
    // Identificador único del pase: cada pase vale por UN examen, y con él se
    // sabe en el servidor si ya se gastó (ver lib/auth/pass.ts).
    .setJti(crypto.randomUUID())
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE_SECONDS}s`)
    .sign(getSigningKey());
}

// Verifica el pase y devuelve su identificador, o null si no es válido.
export async function readAccessPass(token: string | undefined): Promise<{ id: string } | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSigningKey());
    if (payload.paid !== true) return null;
    // Los pases emitidos antes de llevar identificador se reconocen por su firma.
    return { id: payload.jti ?? `sig:${token.split(".")[2]}` };
  } catch {
    return null;
  }
}

// Pase válido (firma y vigencia). No comprueba si ya se gastó: eso requiere la
// base de datos y se hace en el servidor con usableAccessPass.
export async function hasValidAccess(token: string | undefined): Promise<boolean> {
  return (await readAccessPass(token)) !== null;
}

export const accessCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: MAX_AGE_SECONDS,
};
