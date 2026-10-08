import fs from "fs";
import os from "os";
import path from "path";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import {
  canonicalCode,
  clientIp,
  generateCode,
  isCodeRateLimited,
  registerFailedCodeAttempt,
  validHolder,
} from "@/lib/pay/discount";
import { discountedAmount, formatPrice, isAllowedPercent } from "@/lib/pay/price";

describe("price helpers", () => {
  it("computes the discounted price rounded to the cent", () => {
    expect(discountedAmount(15, 10)).toBe(13.5);
    expect(discountedAmount(15, 50)).toBe(7.5);
    expect(discountedAmount(15, 90)).toBe(1.5);
    expect(discountedAmount(15, 100)).toBe(0);
    expect(discountedAmount(9.99, 30)).toBe(6.99);
  });

  it("only allows multiples of 10 from 10 to 100", () => {
    expect([10, 50, 100].every(isAllowedPercent)).toBe(true);
    expect([0, 5, 15, 110, -10].some(isAllowedPercent)).toBe(false);
  });

  it("formats prices for display", () => {
    expect(formatPrice(15, "USD")).toBe("$15 USD");
    expect(formatPrice(7.5, "USD")).toBe("$7.50 USD");
    expect(formatPrice(7.5, "PEN")).toBe("7.50 PEN");
  });
});

describe("discount code helpers", () => {
  it("generates MET-XXXX-XXXX codes without ambiguous characters", () => {
    for (let i = 0; i < 50; i++) {
      expect(generateCode()).toMatch(/^MET-[A-HJKMNP-Z2-9]{4}-[A-HJKMNP-Z2-9]{4}$/);
    }
  });

  it("compares codes ignoring case, spaces and dashes", () => {
    expect(canonicalCode("  met-ab2c-d3ef ")).toBe("METAB2CD3EF");
    expect(canonicalCode("MET AB2C D3EF")).toBe("METAB2CD3EF");
    expect(canonicalCode("metab2cd3ef")).toBe("METAB2CD3EF");
  });

  it("only accepts a browser id shaped like a UUID", () => {
    expect(validHolder("1f3165d5-6132-454f-be3b-2c898f5ebb63")).toBe("1f3165d5-6132-454f-be3b-2c898f5ebb63");
    expect(validHolder("x".repeat(500))).toBeUndefined();
    expect(validHolder(undefined)).toBeUndefined();
  });

  it("takes the client IP from what the proxy sets, not from what the client sends", () => {
    const req = (headers: Record<string, string>) => new Request("http://localhost/", { headers });
    expect(clientIp(req({ "x-real-ip": "203.0.113.7", "x-forwarded-for": "1.1.1.1, 203.0.113.7" }))).toBe("203.0.113.7");
    // Sin X-Real-IP vale el último valor de X-Forwarded-For (el que añade el proxy).
    expect(clientIp(req({ "x-forwarded-for": "1.1.1.1, 203.0.113.7" }))).toBe("203.0.113.7");
    expect(clientIp(req({}))).toBe("unknown");
  });

  it("blocks an IP after too many failed attempts, without affecting others", () => {
    for (let i = 0; i < 8; i++) {
      expect(isCodeRateLimited("198.51.100.1")).toBe(false);
      registerFailedCodeAttempt("198.51.100.1");
    }
    expect(isCodeRateLimited("198.51.100.1")).toBe(true);
    expect(isCodeRateLimited("198.51.100.2")).toBe(false);
  });
});

describe("discount codes in the database", () => {
  // db.ts guarda en <cwd>/data: se trabaja en una carpeta temporal.
  const originalCwd = process.cwd();
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "met-codes-"));
  let db: typeof import("@/lib/db");

  const used = (id: string) => db.listDiscountCodes().find((c) => c.id === id)?.usedCount;
  const reserve = (orderId: string, code: string, holder: string) =>
    db.reserveCodeOrder({ orderId, code, holder, base: 15, currency: "USD" });

  beforeAll(async () => {
    process.chdir(tmp);
    db = await import("@/lib/db");
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  afterAll(() => {
    process.chdir(originalCwd);
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  it("spends a use only when the payment is confirmed, then expires", () => {
    const code = db.createDiscountCode({ percent: 50, maxUses: 2 });
    // Vale escrito en minúsculas y sin guiones.
    expect(db.checkDiscountCode(code.code.toLowerCase().replace(/-/g, ""))).toMatchObject({ ok: true });

    expect(reserve("o1", code.code, "a")).toMatchObject({ ok: true, amount: 7.5 });
    // Iniciar el pago no gasta el uso.
    expect(used(code.id)).toBe(0);

    const first = db.completeOrder("o1", { amount: 7.5, currency: "USD" });
    expect(first.repeated).toBe(false);
    expect(first.payment).toMatchObject({ amount: 7.5, code: code.code, percent: 50, orderId: "o1" });
    expect(used(code.id)).toBe(1);

    // Confirmación repetida: no vuelve a gastar ni a registrar.
    const again = db.completeOrder("o1", { amount: 7.5, currency: "USD" });
    expect(again.repeated).toBe(true);
    expect(again.payment.id).toBe(first.payment.id);
    expect(used(code.id)).toBe(1);

    expect(reserve("o2", code.code, "b")).toMatchObject({ ok: true });
    db.completeOrder("o2", { amount: 7.5, currency: "USD" });
    expect(used(code.id)).toBe(2);
    expect(db.checkDiscountCode(code.code)).toEqual({ ok: false, reason: "invalid" });
    expect(reserve("o3", code.code, "c")).toEqual({ ok: false, reason: "invalid" });
  });

  it("does not let a student's own payment in progress block their code", () => {
    const code = db.createDiscountCode({ percent: 20, maxUses: 1 });
    expect(reserve("r1", code.code, "a")).toMatchObject({ ok: true, amount: 12 });

    // El mismo navegador (recargó la página o reintenta) lo puede volver a aplicar.
    expect(db.checkDiscountCode(code.code, "a")).toMatchObject({ ok: true });
    // Otro navegador no puede llevarse ese mismo uso mientras está reservado.
    expect(db.checkDiscountCode(code.code, "b")).toEqual({ ok: false, reason: "busy" });
    expect(db.checkDiscountCode(code.code)).toEqual({ ok: false, reason: "busy" });
    expect(reserve("r-b", code.code, "b")).toEqual({ ok: false, reason: "busy" });

    // Reintentos del mismo navegador, hasta un tope de pagos abiertos a la vez.
    expect(reserve("r2", code.code, "a")).toMatchObject({ ok: true });
    expect(reserve("r3", code.code, "a")).toMatchObject({ ok: true });
    expect(reserve("r4", code.code, "a")).toEqual({ ok: false, reason: "busy" });
  });

  it("frees the reserved use when the payment form expires unpaid", () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    const code = db.createDiscountCode({ percent: 30, maxUses: 1 });
    expect(reserve("t1", code.code, "a")).toMatchObject({ ok: true });
    expect(db.checkDiscountCode(code.code, "b")).toEqual({ ok: false, reason: "busy" });

    vi.setSystemTime(Date.now() + 21 * 60 * 1000);
    expect(db.checkDiscountCode(code.code, "b")).toMatchObject({ ok: true });
  });

  it("releases the reservation when the payment could not be created", () => {
    const code = db.createDiscountCode({ percent: 40, maxUses: 1 });
    expect(reserve("x1", code.code, "a")).toMatchObject({ ok: true });
    db.cancelPendingOrder("x1");
    expect(db.checkDiscountCode(code.code, "b")).toMatchObject({ ok: true });
  });

  it("redeems free codes once per use and never charges them", () => {
    const free = db.createDiscountCode({ percent: 100, maxUses: 1 });
    const half = db.createDiscountCode({ percent: 50, maxUses: 5 });
    expect(db.redeemFreeCode(half.code)).toBe(false);
    expect(reserve("f1", free.code, "a")).toEqual({ ok: false, reason: "free" });
    expect(db.redeemFreeCode(free.code)).toBe(true);
    expect(db.redeemFreeCode(free.code)).toBe(false);
    expect(used(free.id)).toBe(1);
    expect(used(half.id)).toBe(0);
  });

  it("ignores disabled and deleted codes", () => {
    const code = db.createDiscountCode({ percent: 30, maxUses: 3 });
    db.setDiscountCodeActive(code.id, false);
    expect(db.checkDiscountCode(code.code)).toEqual({ ok: false, reason: "invalid" });
    db.setDiscountCodeActive(code.id, true);
    expect(db.checkDiscountCode(code.code)).toMatchObject({ ok: true });
    expect(db.deleteDiscountCode(code.id)).toBe(true);
    expect(db.checkDiscountCode(code.code)).toEqual({ ok: false, reason: "invalid" });
  });

  it("keeps the code on the payment record even if the admin deleted it meanwhile", () => {
    const code = db.createDiscountCode({ percent: 60, maxUses: 1 });
    expect(reserve("d1", code.code, "a")).toMatchObject({ ok: true, amount: 6 });
    db.deleteDiscountCode(code.id);
    const { payment } = db.completeOrder("d1", { amount: 6, currency: "USD" });
    expect(payment).toMatchObject({ amount: 6, code: code.code, percent: 60 });
  });

  it("records plain payments with the amount IziPay reports and keeps free entries out of revenue", () => {
    const before = db.getAnalytics().revenue;
    db.completeOrder("plain-order", { amount: 15, currency: "USD" });
    const free = db.createDiscountCode({ percent: 100, maxUses: 1 });
    db.redeemFreeCode(free.code);
    const after = db.getAnalytics().revenue;
    expect(after.total - before.total).toBe(15);
    expect(after.count - before.count).toBe(1);

    // Sin datos de IziPay se usa el precio base.
    expect(db.completeOrder(undefined, {}).payment).toMatchObject({ amount: 15, currency: "USD" });
  });
});
