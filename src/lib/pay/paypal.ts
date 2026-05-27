// Integración con PayPal (Orders v2 API) vía REST. Sin SDK.
// Requiere PAYPAL_CLIENT_ID y PAYPAL_SECRET. PAYPAL_ENV = "sandbox" | "live".

function apiBase(): string {
  return (process.env.PAYPAL_ENV || "sandbox").toLowerCase() === "live"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";
}

export function paypalConfigured(): boolean {
  return Boolean(process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_SECRET);
}

async function getAccessToken(): Promise<string> {
  const id = process.env.PAYPAL_CLIENT_ID!;
  const secret = process.env.PAYPAL_SECRET!;
  const auth = Buffer.from(`${id}:${secret}`).toString("base64");
  const res = await fetch(`${apiBase()}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  if (!res.ok) throw new Error("paypal_auth_failed");
  const data = (await res.json()) as { access_token: string };
  return data.access_token;
}

interface PayPalLink {
  rel: string;
  href: string;
}

// Crea una orden y devuelve la URL de aprobación a la que redirigir al usuario.
export async function createOrder(opts: {
  amount: string;
  currency: string;
  returnUrl: string;
  cancelUrl: string;
}): Promise<string> {
  const token = await getAccessToken();
  const res = await fetch(`${apiBase()}/v2/checkout/orders`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      intent: "CAPTURE",
      purchase_units: [
        {
          amount: { currency_code: opts.currency, value: opts.amount },
          description: "Acceso ExamBridge MET — Examen completo",
        },
      ],
      application_context: {
        brand_name: "ExamBridge MET",
        user_action: "PAY_NOW",
        shipping_preference: "NO_SHIPPING",
        return_url: opts.returnUrl,
        cancel_url: opts.cancelUrl,
      },
    }),
  });
  if (!res.ok) throw new Error("paypal_create_failed");
  const data = (await res.json()) as { links?: PayPalLink[] };
  const approve = data.links?.find((l) => l.rel === "approve" || l.rel === "payer-action");
  if (!approve) throw new Error("paypal_no_approve_link");
  return approve.href;
}

// Captura la orden tras la aprobación. Devuelve true solo si quedó COMPLETED.
export async function captureOrder(orderId: string): Promise<boolean> {
  const token = await getAccessToken();
  const res = await fetch(`${apiBase()}/v2/checkout/orders/${orderId}/capture`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
  });
  if (!res.ok) return false;
  const data = (await res.json()) as { status?: string };
  return data.status === "COMPLETED";
}
