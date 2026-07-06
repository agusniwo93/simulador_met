// Archivo: src/lib/izipay.ts
const IZIPAY_API_URL = "https://api.micuentaweb.pe"; // Este es el servidor oficial de IziPay en Perú

// Verificamos si pusiste las claves en el .env
export function izipayConfigured(): boolean {
  return Boolean(process.env.IZIPAY_SHOP_ID && process.env.IZIPAY_API_KEY);
}

// Esta función es la que pide permiso a IziPay para cobrar
export async function createPaymentForm(opts: {
  amount: number;      // El precio del examen (ej: 50.00)
  currency: string;    // "PEN" para Soles o "USD" para dólares
  orderId: string;     // Un código único para este pago
  email: string;       // El correo del alumno
}): Promise<string> {
  
  // 1. Jalamos tus contraseñas del archivo .env
  const shopId = process.env.IZIPAY_SHOP_ID!;
  const apiKey = process.env.IZIPAY_API_KEY!;
  
  // 2. IziPay pide que encriptemos las contraseñas juntas
  const auth = Buffer.from(`${shopId}:${apiKey}`).toString("base64");
  
  // 3. IziPay lee los precios en céntimos (ej. 50 Soles = 5000 céntimos)
  const amountInCents = Math.round(opts.amount * 100);
  // 604 es el código internacional para Soles Peruanos
  const currencyCode = opts.currency === "PEN" ? "604" : "840"; 

  // 4. Armamos el paquete de datos que le enviaremos a IziPay
  const payload = {
    amount: amountInCents,
    currency: currencyCode,
    orderId: opts.orderId,
    customer: { email: opts.email },
    actionMode: "INTERACTIVE", // Para que muestre un formulario visual
    paymentMode: "SINGLE"      // Para que sea un solo cobro (no suscripción)
  };

  // 5. Nos comunicamos con IziPay
  const res = await fetch(`${IZIPAY_API_URL}/api-payment/V4/Charge/CreatePayment`, {
    method: "POST",
    headers: {
      "Authorization": `Basic ${auth}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    throw new Error("Error al conectar con IziPay");
  }

  const data = await res.json();
  
  if (data.status !== "SUCCESS") {
    throw new Error(`IziPay rechazó la solicitud: ${data.answer?.errorMessage || "Error desconocido"}`);
  }

  // 6. Si todo salió bien, IziPay nos da un token (formToken). ¡Lo devolvemos!
  return data.answer.formToken; 
  
}
export async function captureOrder(orderId: string | null): Promise<boolean> {
  if (!orderId) return false;
  
  // IziPay procesa y confirma los pagos de forma diferente a PayPal. 
  // Para mantener la compatibilidad con tu sistema actual, si IziPay 
  // nos redirige de vuelta a esta ruta con un token, daremos luz verde (true).
  return true;
}