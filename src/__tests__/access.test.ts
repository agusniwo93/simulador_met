import { describe, expect, it } from "vitest";
import { hasValidAccess, signAccessPass } from "@/lib/access";

describe("access pass", () => {
  it("signs a pass that validates as true", async () => {
    const token = await signAccessPass();
    expect(typeof token).toBe("string");
    expect(token.length).toBeGreaterThan(0);
    await expect(hasValidAccess(token)).resolves.toBe(true);
  });

  it("rejects an undefined token", async () => {
    await expect(hasValidAccess(undefined)).resolves.toBe(false);
  });

  it("rejects a garbage token", async () => {
    await expect(hasValidAccess("garbage")).resolves.toBe(false);
  });
});
