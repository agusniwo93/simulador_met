import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getAdminCode,
  verifyAdminCode,
  isRateLimited,
  registerFailedAttempt,
  clearAttempts,
} from "@/lib/auth/admin";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("getAdminCode", () => {
  it("uses the default admin code when env is unset (dev)", () => {
    vi.stubEnv("ADMIN_CODE", "");
    expect(getAdminCode()).toBe("met-admin-2026");
  });

  it("uses the env value when set", () => {
    vi.stubEnv("ADMIN_CODE", "secret-code");
    expect(getAdminCode()).toBe("secret-code");
  });
});

describe("verifyAdminCode", () => {
  it("accepts the correct code", () => {
    vi.stubEnv("ADMIN_CODE", "secret-code");
    expect(verifyAdminCode("secret-code")).toBe(true);
  });

  it("rejects a wrong code", () => {
    vi.stubEnv("ADMIN_CODE", "secret-code");
    expect(verifyAdminCode("nope")).toBe(false);
  });

  it("rejects an empty code", () => {
    vi.stubEnv("ADMIN_CODE", "secret-code");
    expect(verifyAdminCode("")).toBe(false);
  });

  it("rejects a code of different length", () => {
    vi.stubEnv("ADMIN_CODE", "secret-code");
    expect(verifyAdminCode("secret-code-longer")).toBe(false);
  });
});

describe("rate limiting (anti brute-force)", () => {
  it("locks after 5 failed attempts and clears on success", () => {
    const ip = "10.0.0.1";
    expect(isRateLimited(ip)).toBe(false);
    for (let i = 0; i < 5; i++) registerFailedAttempt(ip);
    expect(isRateLimited(ip)).toBe(true);
    clearAttempts(ip);
    expect(isRateLimited(ip)).toBe(false);
  });

  it("does not lock independent IPs", () => {
    const ip = "10.0.0.2";
    registerFailedAttempt(ip);
    expect(isRateLimited(ip)).toBe(false);
  });
});
