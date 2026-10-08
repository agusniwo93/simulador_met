// Precios y descuentos: funciones puras, válidas en el servidor y en el navegador.

// Descuentos que el admin puede elegir. 100 = gratis.
export const ALLOWED_PERCENTS = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100] as const;

export function isAllowedPercent(n: number): boolean {
  return (ALLOWED_PERCENTS as readonly number[]).includes(n);
}

// Precio final tras aplicar el descuento, redondeado al céntimo.
export function discountedAmount(base: number, percent: number): number {
  const cents = Math.round(base * 100);
  return Math.round((cents * (100 - percent)) / 100) / 100;
}

// Formatea un precio para mostrarlo: "$15 USD", "$7.50 USD", "7.50 PEN".
export function formatPrice(amount: number, currency: string): string {
  const n = Number.isInteger(amount) ? String(amount) : amount.toFixed(2);
  return currency === "USD" ? `$${n} USD` : `${n} ${currency}`;
}
