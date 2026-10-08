import crypto from "crypto";
import fs from "fs";
import os from "os";
import path from "path";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

// Rutas de pago con códigos de descuento, de punta a punta, con IziPay simulado.

const mocks = vi.hoisted(() => ({
  // Cookies que "envía" el navegador en cada petición.
  cookieJar: new Map<string, string>(),
  createPaymentForm: vi.fn<
    (opts: { amount: number; currency: string; orderId: string; email: string }) => Promise<string>
  >(async () => "form-token"),
}));

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) =>
      mocks.cookieJar.has(name) ? { name, value: mocks.cookieJar.get(name) as string } : undefined,
  }),
}));

vi.mock("@/lib/pay/izipay", () => ({
  CHARGE_CURRENCY: "USD",
  izipayConfigured: () => true,
  createPaymentForm: mocks.createPaymentForm,
}));

const HMAC_KEY = "test-hmac-key";
const originalCwd = process.cwd();
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "met-pay-"));

let db: typeof import("@/lib/db");
let createRoute: typeof import("@/app/api/pay/create/route");
let codeRoute: typeof import("@/app/api/pay/code/route");
let redeemRoute: typeof import("@/app/api/pay/redeem/route");
let confirmRoute: typeof import("@/app/api/pay/confirm/route");

beforeAll(async () => {
  process.chdir(tmp); // db.ts guarda en <cwd>/data
  process.env.IZIPAY_HASH_KEY = HMAC_KEY;
  process.env.IZIPAY_PUBLIC_KEY = "public-key";
  delete process.env.PAY_AMOUNT;
  db = await import("@/lib/db");
  createRoute = await import("@/app/api/pay/create/route");
  codeRoute = await import("@/app/api/pay/code/route");
  redeemRoute = await import("@/app/api/pay/redeem/route");
  confirmRoute = await import("@/app/api/pay/confirm/route");
});

beforeEach(() => {
  mocks.cookieJar.clear();
  mocks.createPaymentForm.mockClear();
});

afterEach(() => {
  vi.useRealTimers();
});

afterAll(() => {
  process.chdir(originalCwd);
  fs.rmSync(tmp, { recursive: true, force: true });
});

// Cada prueba usa su propia IP para no compartir el límite de intentos.
let ipSeq = 0;
const newIp = () => `203.0.113.${++ipSeq}`;

const post = (pathname: string, body: unknown, ip: string) =>
  new Request(`http://localhost${pathname}`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-real-ip": ip },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });

// Inicia un pago y, como haría el navegador, guarda la cookie que devuelva.
async function startPayment(body: unknown, ip: string) {
  const res = await createRoute.POST(post("/api/pay/create", body, ip));
  const hold = res.cookies.get("met_hold")?.value;
  if (hold) mocks.cookieJar.set("met_hold", hold);
  return { status: res.status, data: await res.json() };
}

async function checkCode(code: string, ip: string) {
  const res = await codeRoute.POST(post("/api/pay/code", { code }, ip));
  return { status: res.status, data: await res.json() };
}

const lastOrderId = () => mocks.createPaymentForm.mock.calls.at(-1)![0].orderId;
const used = (id: string) => db.listDiscountCodes().find((c) => c.id === id)?.usedCount;
const storedDb = () =>
  JSON.parse(fs.readFileSync(path.join(tmp, "data", "db.json"), "utf-8")) as {
    pendingOrders?: unknown[];
    payments?: { orderId?: string; amount: number; code?: string }[];
  };

// Confirmación tal como la envía IziPay (kr-answer firmado con la clave HMAC).
function confirmation(answer: object, opts: { forged?: boolean } = {}) {
  const raw = JSON.stringify(answer);
  const hash = opts.forged
    ? "0".repeat(64)
    : crypto.createHmac("sha256", HMAC_KEY).update(raw).digest("hex");
  return new Request("http://localhost/api/pay/confirm", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded", "x-forwarded-host": "sitio.test" },
    body: new URLSearchParams({ "kr-answer": raw, "kr-hash": hash }).toString(),
  });
}

const paid = (orderId: string, cents: number, serverDate = new Date().toISOString()) => ({
  orderStatus: "PAID",
  serverDate,
  orderDetails: { orderId, orderTotalAmount: cents, orderCurrency: "USD" },
});

async function confirm(answer: object, opts?: { forged?: boolean }) {
  const res = await confirmRoute.POST(confirmation(answer, opts));
  return {
    location: res.headers.get("location"),
    access: Boolean(res.cookies.get("met_access")?.value),
  };
}

const ENTERED = { location: "https://sitio.test/exam", access: true };
const REJECTED = { location: "https://sitio.test/?pay=failed", access: false };

describe("starting a payment", () => {
  it("charges the full price without a code and reserves nothing", async () => {
    const { status, data } = await startPayment({}, newIp());
    expect(status).toBe(200);
    expect(data).toMatchObject({ formToken: "form-token", publicKey: "public-key", amount: 15, currency: "USD" });
    expect(mocks.createPaymentForm).toHaveBeenCalledWith(expect.objectContaining({ amount: 15 }));
    expect(storedDb().pendingOrders ?? []).toHaveLength(0);
  });

  it("charges the discounted price decided by the server", async () => {
    const code = db.createDiscountCode({ percent: 90, maxUses: 1 });
    const { status, data } = await startPayment({ code: ` ${code.code.toLowerCase()} ` }, newIp());
    expect(status).toBe(200);
    expect(data.amount).toBe(1.5);
    expect(mocks.createPaymentForm).toHaveBeenCalledWith(expect.objectContaining({ amount: 1.5 }));
    expect(used(code.id)).toBe(0);
  });

  it("rejects an unknown or malformed code instead of charging the full price", async () => {
    const ip = newIp();
    expect(await startPayment({ code: "MET-XXXX-YYYY" }, ip)).toMatchObject({ status: 400, data: { error: "code_invalid" } });
    expect(await startPayment({ code: 12345 }, ip)).toMatchObject({ status: 400, data: { error: "code_invalid" } });
    expect(mocks.createPaymentForm).not.toHaveBeenCalled();
  });

  it("sends free codes to the redeem route instead of IziPay", async () => {
    const free = db.createDiscountCode({ percent: 100, maxUses: 1 });
    expect(await startPayment({ code: free.code }, newIp())).toMatchObject({ status: 400, data: { error: "code_free" } });
    expect(mocks.createPaymentForm).not.toHaveBeenCalled();
  });

  it("lets the same browser re-apply its code after a reload, while another browser must wait", async () => {
    const code = db.createDiscountCode({ percent: 50, maxUses: 1 });
    const ip = newIp();
    expect((await startPayment({ code: code.code }, ip)).status).toBe(200);

    // Mismo navegador (conserva su cookie): recarga la página y vuelve a aplicar.
    expect(await checkCode(code.code, ip)).toMatchObject({ status: 200, data: { percent: 50, amount: 7.5, free: false } });
    expect((await startPayment({ code: code.code }, ip)).status).toBe(200);

    // Otro navegador (sin esa cookie): el único uso está en un pago en curso.
    mocks.cookieJar.clear();
    const other = newIp();
    expect(await checkCode(code.code, other)).toMatchObject({ status: 409, data: { error: "code_busy" } });
    expect(await startPayment({ code: code.code }, other)).toMatchObject({ status: 409, data: { error: "code_busy" } });
  });

  it("releases the reserved use if IziPay cannot create the payment", async () => {
    const code = db.createDiscountCode({ percent: 50, maxUses: 1 });
    mocks.createPaymentForm.mockRejectedValueOnce(new Error("IziPay caído"));
    expect((await startPayment({ code: code.code }, newIp())).status).toBe(500);

    mocks.cookieJar.clear();
    expect((await checkCode(code.code, newIp())).status).toBe(200);
  });
});

describe("checking a code", () => {
  it("blocks an IP that keeps guessing, even for a valid code", async () => {
    const code = db.createDiscountCode({ percent: 50, maxUses: 5 });
    const ip = newIp();
    for (let i = 0; i < 8; i++) {
      expect((await checkCode(`MET-AAAA-AAA${i}`, ip)).status).toBe(400);
    }
    expect(await checkCode(code.code, ip)).toMatchObject({ status: 429, data: { error: "rate_limited" } });
    expect((await checkCode(code.code, newIp())).status).toBe(200);
  });
});

describe("redeeming a free code", () => {
  it("grants access once per use and never for a partial discount", async () => {
    const free = db.createDiscountCode({ percent: 100, maxUses: 1 });
    const half = db.createDiscountCode({ percent: 50, maxUses: 1 });
    const ip = newIp();
    const redeem = (code: string) => redeemRoute.POST(post("/api/pay/redeem", { code }, ip));

    const denied = await redeem(half.code);
    expect(denied.status).toBe(400);
    expect(denied.cookies.get("met_access")).toBeUndefined();

    const granted = await redeem(free.code);
    expect(granted.status).toBe(200);
    expect(granted.cookies.get("met_access")?.value).toBeTruthy();
    expect(used(free.id)).toBe(1);

    const again = await redeem(free.code);
    expect(again.status).toBe(400);
    expect(again.cookies.get("met_access")).toBeUndefined();
    expect(used(free.id)).toBe(1);
  });
});

describe("confirming a payment", () => {
  it("grants access, records the real amount and spends the code use exactly once", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    const code = db.createDiscountCode({ percent: 50, maxUses: 1 });
    await startPayment({ code: code.code }, newIp());
    const orderId = lastOrderId();

    expect(await confirm(paid(orderId, 750))).toEqual(ENTERED);
    expect(used(code.id)).toBe(1);
    expect(storedDb().payments?.filter((p) => p.orderId === orderId)).toEqual([
      expect.objectContaining({ amount: 7.5, code: code.code }),
    ]);

    // Doble envío inmediato del mismo formulario: entra, sin registrar nada más.
    expect(await confirm(paid(orderId, 750))).toEqual(ENTERED);
    expect(used(code.id)).toBe(1);
    expect(storedDb().payments?.filter((p) => p.orderId === orderId)).toHaveLength(1);

    // La misma confirmación reenviada más tarde ya no abre un pase nuevo.
    vi.setSystemTime(Date.now() + 3 * 60 * 1000);
    expect(await confirm(paid(orderId, 750))).toEqual(REJECTED);
    expect(used(code.id)).toBe(1);
  });

  it("accepts a normal full-price payment", async () => {
    await startPayment({}, newIp());
    const orderId = lastOrderId();
    expect(await confirm(paid(orderId, 1500))).toEqual(ENTERED);
    expect(storedDb().payments?.find((p) => p.orderId === orderId)).toMatchObject({ amount: 15 });
  });

  it("rejects forged, unpaid and expired confirmations", async () => {
    expect(await confirm(paid("forged-order", 1500), { forged: true })).toEqual(REJECTED);
    expect(await confirm({ ...paid("unpaid-order", 1500), orderStatus: "UNPAID" })).toEqual(REJECTED);

    const twoDaysAgo = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
    expect(await confirm(paid("old-order", 1500, twoDaysAgo))).toEqual(REJECTED);

    const recorded = storedDb().payments ?? [];
    expect(recorded.some((p) => ["forged-order", "unpaid-order", "old-order"].includes(p.orderId ?? ""))).toBe(false);
  });
});
