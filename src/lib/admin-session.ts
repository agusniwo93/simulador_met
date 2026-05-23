import { SignJWT, jwtVerify } from "jose";
import { getSigningKey } from "./access";

// Sesión de administrador firmada (cookie HttpOnly). Edge-safe (solo jose),
// para poder verificarla en el middleware. NO contiene el código admin.

export const ADMIN_COOKIE = "met_admin";
const MAX_AGE_SECONDS = 60 * 60 * 8; // 8 horas

export async function signAdminSession(): Promise<string> {
  return new SignJWT({ admin: true })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE_SECONDS}s`)
    .sign(getSigningKey());
}

export async function hasAdminSession(token: string | undefined): Promise<boolean> {
  if (!token) return false;
  try {
    const { payload } = await jwtVerify(token, getSigningKey());
    return payload.admin === true;
  } catch {
    return false;
  }
}

export const adminCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: MAX_AGE_SECONDS,
};
