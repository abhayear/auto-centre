import crypto from "crypto";
import { describe, expect, it } from "vitest";
import {
  amountToPaise,
  getEffectiveOnlineBookingAmount,
  requiresOnlineBookingPayment,
  resolveOnlineBookingAmount,
  verifyRazorpayPaymentSignature,
} from "../booking-payment";

describe("resolveOnlineBookingAmount", () => {
  it("returns amount for test drive bookings", () => {
    expect(resolveOnlineBookingAmount("test_drive", "vehicle-1", 999)).toBe(999);
  });

  it("returns null when amount is missing", () => {
    expect(resolveOnlineBookingAmount("test_drive", "vehicle-1", null)).toBeNull();
  });
});

describe("getEffectiveOnlineBookingAmount", () => {
  it("prefers per-vehicle amount over site default", () => {
    expect(getEffectiveOnlineBookingAmount(799, 499)).toBe(799);
  });

  it("falls back to site default when vehicle amount is null", () => {
    expect(getEffectiveOnlineBookingAmount(null, 499)).toBe(499);
  });

  it("returns null when neither amount is set", () => {
    expect(getEffectiveOnlineBookingAmount(null, null)).toBeNull();
  });

  it("ignores zero or negative amounts", () => {
    expect(getEffectiveOnlineBookingAmount(0, 499)).toBeNull();
    expect(getEffectiveOnlineBookingAmount(null, 0)).toBeNull();
  });
});

describe("requiresOnlineBookingPayment", () => {
  it("returns true for positive amounts", () => {
    expect(requiresOnlineBookingPayment(500)).toBe(true);
  });

  it("returns false for empty amounts", () => {
    expect(requiresOnlineBookingPayment(null)).toBe(false);
    expect(requiresOnlineBookingPayment(0)).toBe(false);
  });
});

describe("amountToPaise", () => {
  it("converts rupees to paise", () => {
    expect(amountToPaise(499.5)).toBe(49950);
  });
});

describe("verifyRazorpayPaymentSignature", () => {
  it("validates a known signature", () => {
    const secret = "test_secret";
    const orderId = "order_123";
    const paymentId = "pay_456";
    const signature = crypto
      .createHmac("sha256", secret)
      .update(`${orderId}|${paymentId}`)
      .digest("hex");

    expect(verifyRazorpayPaymentSignature(orderId, paymentId, signature, secret)).toBe(
      true,
    );
  });

  it("rejects invalid signatures", () => {
    expect(
      verifyRazorpayPaymentSignature("order_1", "pay_1", "bad-signature", "secret"),
    ).toBe(false);
  });
});
