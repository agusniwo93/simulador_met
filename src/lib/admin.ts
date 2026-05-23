// Compuerta simple del panel admin: un único código compartido (sin cuentas ni sesiones).
// Se envía en el header "x-admin-code" y se compara con ADMIN_CODE del entorno.

export const ADMIN_CODE_HEADER = "x-admin-code";

export function getAdminCode(): string {
  return process.env.ADMIN_CODE || "met-admin-2026";
}

export function isAdminRequest(req: Request): boolean {
  const provided = req.headers.get(ADMIN_CODE_HEADER) ?? "";
  return provided.length > 0 && provided === getAdminCode();
}
