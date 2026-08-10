import crypto from "crypto";

export type BookingPaymentStatus = "not_required" | "pending" | "paid" | "failed";

export function resolveOnlineBookingAmount(
  type: string,
  vehicleId: string | undefined | null,
  onlineBookingAmount: number | null | undefined,
): number | null {
  if (type !== "test_drive" || !vehicleId) return null;
  if (onlineBookingAmount == null || onlineBookingAmount <= 0) return null;
  return onlineBookingAmount;
}

export function requiresOnlineBookingPayment(amount: number | null | undefined): boolean {
  return amount != null && amount > 0;
}

export function amountToPaise(amount: number): number {
  return Math.round(amount * 100);
}

export function verifyRazorpayPaymentSignature(
  orderId: string,
  paymentId: string,
  signature: string,
  secret: string,
): boolean {
  const expected = crypto
    .createHmac("sha256", secret)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");
  return expected === signature;
}

export function isRazorpayConfigured(): boolean {
  return Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);
}

export function getRazorpayKeyId(): string | null {
  return process.env.RAZORPAY_KEY_ID ?? null;
}
