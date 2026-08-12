import { SITE_NAME } from "@/lib/constants";
import { getSiteUrl } from "@/lib/site-url";

/** Strip to last 10 digits from an Indian phone number. */
export function normalizeIndianPhone(contact: string | null | undefined): string | undefined {
  if (!contact) return undefined;
  const digits = contact.replace(/\D/g, "");
  if (digits.length < 10) return undefined;
  return digits.slice(-10);
}

/** Razorpay expects +{country}{number}; defaults to US (+1) if missing. */
export function formatRazorpayContact(contact: string | null | undefined): string | undefined {
  const local = normalizeIndianPhone(contact);
  if (!local) return undefined;
  return `+91${local}`;
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

type RazorpayCheckoutMethodConfig = {
  method?: string | {
    upi?: boolean;
    card?: boolean;
    netbanking?: boolean;
    wallet?: boolean;
  };
  config?: {
    display?: {
      hide?: Array<{ method: string }>;
      sequence?: string[];
      preferences?: {
        show_default_blocks?: boolean;
      };
    };
  };
};

/** Test keys cannot validate real UPI IDs — hide UPI and default to card. */
export function buildRazorpayMethodConfig(testMode: boolean): RazorpayCheckoutMethodConfig {
  if (testMode) {
    return {
      method: "card",
      config: {
        display: {
          hide: [{ method: "upi" }],
          preferences: { show_default_blocks: true },
        },
      },
    };
  }

  return {
    config: {
      display: {
        sequence: ["upi", "card", "netbanking", "wallet"],
        preferences: { show_default_blocks: true },
      },
    },
  };
}

export type { RazorpayCheckoutMethodConfig };
