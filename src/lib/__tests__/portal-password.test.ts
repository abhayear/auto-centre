import { describe, expect, it, vi } from "vitest";
import { decryptPortalPassword, encryptPortalPassword } from "@/lib/portal-password";

describe("portal password", () => {
  it("round-trips a non-empty password", () => {
    vi.stubEnv("AUTH_SECRET", "test-auth-secret-for-inventory-key");
    const stored = encryptPortalPassword("vendor-secret");
    expect(stored).not.toBe("vendor-secret");
    expect(decryptPortalPassword(stored)).toBe("vendor-secret");
  });

  it("stores empty as empty", () => {
    expect(encryptPortalPassword("")).toBe("");
    expect(decryptPortalPassword("")).toBe("");
  });
});
