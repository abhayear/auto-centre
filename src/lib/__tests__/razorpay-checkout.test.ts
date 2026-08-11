import { describe, expect, it } from "vitest";
import {
  formatRazorpayContact,
  isRazorpayTestKey,
  normalizeIndianPhone,
  resolveRazorpayMerchantImage,
} from "../razorpay-checkout";

describe("normalizeIndianPhone", () => {
  it("returns last 10 digits", () => {
    expect(normalizeIndianPhone("+91 79858 31851")).toBe("7985831851");
  });

  it("returns undefined for short numbers", () => {
    expect(normalizeIndianPhone("12345")).toBeUndefined();
  });
});

describe("formatRazorpayContact", () => {
  it("prefixes Indian numbers with +91", () => {
    expect(formatRazorpayContact("7985831851")).toBe("+917985831851");
    expect(formatRazorpayContact("+91 79858 31851")).toBe("+917985831851");
  });

  it("returns undefined for invalid numbers", () => {
    expect(formatRazorpayContact("123")).toBeUndefined();
  });
});

describe("isRazorpayTestKey", () => {
  it("detects test keys", () => {
    expect(isRazorpayTestKey("rzp_test_abc")).toBe(true);
    expect(isRazorpayTestKey("rzp_live_abc")).toBe(false);
  });
});

describe("resolveRazorpayMerchantImage", () => {
  it("builds absolute URL for relative paths", () => {
    process.env.NEXTAUTH_URL = "https://autogalaxy.in";
    expect(resolveRazorpayMerchantImage("/uploads/logo.png")).toBe(
      "https://autogalaxy.in/uploads/logo.png",
    );
  });

  it("passes through absolute URLs", () => {
    expect(resolveRazorpayMerchantImage("https://cdn.example.com/logo.png")).toBe(
      "https://cdn.example.com/logo.png",
    );
  });
});
