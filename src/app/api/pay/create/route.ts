import { NextResponse } from "next/server";
import { izipayConfigured, createPaymentForm } from "@/lib/pay/izipay";

export async function POST() {
  try {
    // 1. Verificamos que tus variables del .env existan
    if (!izipayConfigured()) {
      console.error("IziPay no está configurado en el .env");
      return NextResponse.json({ error: "not_configured" }, { status: 500 });
    }

    // 2. Generamos un código de orden único para este alumno
    const orderId = `MET-${Date.now()}`;
    
    // 3. Tomamos el precio de tu .env (o usamos 15 por defecto)
    const amount = Number(process.env.PAY_AMOUNT) || 15;
    const currency = process.env.PAY_CURRENCY || "USD";
    
    // IziPay pide un correo, ponemos uno genérico ya que tu sistema no usa cuentas
    const email = "alumno@simulador-met.com"; 

    // 4. Llamamos a tu motor de IziPay para generar el pase mágico
    const formToken = await createPaymentForm({
      amount,
      currency,
      orderId,
      email
    });

    // 5. Enviamos la llave pública y el token a la pantalla (LandingClient)
    const publicKey = process.env.IZIPAY_PUBLIC_KEY;

    return NextResponse.json({ formToken, publicKey });
    
  } catch (error: unknown) {
    console.error("Error al crear pago IziPay:", error);
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}