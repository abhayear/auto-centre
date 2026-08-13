import { describe, expect, it } from "vitest";
import {
  buildOtpWhatsAppMessage,
  buildWhatsAppFallbackLink,
  generateOtpCode,
  isOtpExpired,
  normalizeSubscriptionPhone,
} from "@/lib/whatsapp-verification";

describe("whatsapp-verification", () => {
  it("normalizes Indian phone numbers", () => {
    expect(normalizeSubscriptionPhone("+91 79858 31851")).toBe("7985831851");
    expect(normalizeSubscriptionPhone("123")).toBeNull();
  });

  it("generates 6-digit OTP codes", () => {
    const code = generateOtpCode();
    expect(code).toMatch(/^\d{6}$/);
  });

  it("detects expired OTP", () => {
    expect(isOtpExpired(new Date(Date.now() - 1000))).toBe(true);
    expect(isOtpExpired(new Date(Date.now() + 60_000))).toBe(false);
  });

  it("builds OTP WhatsApp message", () => {
    expect(buildOtpWhatsAppMessage("123456")).toContain("123456");
  });

  it("builds WhatsApp fallback link", () => {
    const url = buildWhatsAppFallbackLink("654321");
    expect(url).toContain("wa.me/");
    expect(url).toContain("654321");
  });
});
