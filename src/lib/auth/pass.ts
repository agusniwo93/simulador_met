import { readAccessPass } from "./access";
import { getPassRecord } from "@/lib/db";

// Cada pase de acceso (pago o código) vale por UN examen. Aquí se comprueba,
// además de la firma y la vigencia, que el pase no se haya gastado ya.
// Solo para el servidor (consulta la base de datos): el middleware no puede
// usarlo y se limita a validar la firma.

// Devuelve el pase si es válido y todavía sirve para rendir un examen.
export async function usableAccessPass(token: string | undefined): Promise<{ id: string } | null> {
  const pass = await readAccessPass(token);
  if (!pass) return null;
  return getPassRecord(pass.id)?.resultId ? null : pass;
}
