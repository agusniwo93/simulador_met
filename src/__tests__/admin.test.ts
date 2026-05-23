import { afterEach, describe, expect, it, vi } from "vitest";
import { ADMIN_CODE_HEADER, getAdminCode, isAdminRequest } from "@/lib/admin";

afterEach(() => {
  vi.unstubAllEnvs();
});

function makeRequest(code?: string): Request {
  const headers: Record<string, string> = {};
  if (code !== undefined) headers[ADMIN_CODE_HEADER] = code;
  return new Request("http://x", { headers });
}

describe("isAdminRequest", () => {
  it("uses the default admin code when env is unset", () => {
    vi.stubEnv("ADMIN_CODE", "");
    expect(getAdminCode()).toBe("met-admin-2026");
    expect(isAdminRequest(makeRequest("met-admin-2026"))).toBe(true);
  });

  it("accepts the correct code from the environment", () => {
    vi.stubEnv("ADMIN_CODE", "secret-code");
    expect(isAdminRequest(makeRequest("secret-code"))).toBe(true);
  });

  it("rejects a wrong code", () => {
    vi.stubEnv("ADMIN_CODE", "secret-code");
    expect(isAdminRequest(makeRequest("nope"))).toBe(false);
  });

  it("rejects a request without the header", () => {
    vi.stubEnv("ADMIN_CODE", "secret-code");
    expect(isAdminRequest(makeRequest())).toBe(false);
  });
});
