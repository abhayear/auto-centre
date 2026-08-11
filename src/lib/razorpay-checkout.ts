import { SITE_NAME } from "@/lib/constants";
import { getSiteUrl } from "@/lib/site-url";

/** Strip to last 10 digits for Razorpay/UPI prefill. */
export function normalizeIndianPhone(contact: string | null | undefined): string | undefined {
  if (!contact) return undefined;
  const digits = contact.replace(/\D/g, "");
  if (digits.length < 10) return undefined;
  return digits.slice(-10);
}

export function isRazorpayTestKey(keyId: string | null | undefined): boolean {
  return Boolean(keyId?.startsWith("rzp_test_"));
}

/** Razorpay requires an absolute https URL for checkout branding. */
export function resolveRazorpayMerchantImage(logoUrl: string | null | undefined): string | undefined {
  if (!logoUrl?.trim()) return undefined;
  const trimmed = logoUrl.trim();
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }
  const origin = getSiteUrl();
  return `${origin}${trimmed.startsWith("/") ? trimmed : `/${trimmed}`}`;
}

export function getRazorpayMerchantName(): string {
  return SITE_NAME;
}
