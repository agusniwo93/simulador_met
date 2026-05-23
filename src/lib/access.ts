import { SignJWT, jwtVerify } from "jose";

// Pase de acceso (NO es una cuenta): se emite tras pagar y permite rendir el examen.
// Edge-safe (solo jose) para poder usarse en el middleware.

export const ACCESS_COOKIE = "met_access";
const MAX_AGE_SECONDS = 60 * 60 * 24; // 24 horas

function secretKey(): Uint8Array {
  const secret = process.env.ACCESS_SECRET || "met-access-dev-secret-change-me";
  return new TextEncoder().encode(secret);
}

export async function signAccessPass(): Promise<string> {
  return new SignJWT({ paid: true })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE_SECONDS}s`)
    .sign(secretKey());
}

export async function hasValidAccess(token: string | undefined): Promise<boolean> {
  if (!token) return false;
  try {
    const { payload } = await jwtVerify(token, secretKey());
    return payload.paid === true;
  } catch {
    return false;
  }
}

export const accessCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: MAX_AGE_SECONDS,
};
