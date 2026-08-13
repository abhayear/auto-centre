import { SITE_NAME, SITE_PHONES } from "@/lib/constants";
import { normalizeIndianPhone } from "@/lib/razorpay-checkout";
import { formatWhatsAppRecipient, sendWhatsAppText } from "@/lib/whatsapp-notify";

export const OTP_EXPIRY_MINUTES = 10;
export const OTP_LENGTH = 6;

export function normalizeSubscriptionPhone(phone: string): string | null {
  const local = normalizeIndianPhone(phone);
  return local ?? null;
}

export function generateOtpCode(): string {
  const max = 10 ** OTP_LENGTH;
  const value = Math.floor(Math.random() * max);
  return value.toString().padStart(OTP_LENGTH, "0");
}

export function isOtpExpired(expiresAt: Date): boolean {
  return expiresAt.getTime() <= Date.now();
}

export function buildOtpWhatsAppMessage(code: string): string {
  return [
    `${SITE_NAME} update verification`,
    "",
    `Your verification code is: ${code}`,
    "",
    `This code expires in ${OTP_EXPIRY_MINUTES} minutes.`,
    "Enter it on our Contact page to confirm WhatsApp updates.",
  ].join("\n");
}

export function buildUpdatesWelcomeMessage(name: string): string {
  return [
    `Hi ${name},`,
    "",
    `You're verified for ${SITE_NAME} updates on WhatsApp.`,
    "We'll share offers, new Yakuza models, and service reminders here.",
    "",
    "Reply STOP anytime to opt out.",
  ].join("\n");
}

export function buildAdminNewSubscriberMessage(input: {
  name: string;
  phone: string;
  email?: string | null;
}): string {
  const lines = [
    "New verified WhatsApp update subscriber",
    "",
    `Name: ${input.name}`,
    `Phone: ${input.phone}`,
  ];
  if (input.email) lines.push(`Email: ${input.email}`);
  return lines.join("\n");
}

export async function sendOtpToPhone(phone: string, code: string): Promise<{ ok: boolean; error?: string }> {
  const recipient = formatWhatsAppRecipient(phone);
  return sendWhatsAppText(recipient, buildOtpWhatsAppMessage(code));
}

export async function sendWelcomeToSubscriber(
  phone: string,
  name: string,
): Promise<{ ok: boolean; error?: string }> {
  const recipient = formatWhatsAppRecipient(phone);
  return sendWhatsAppText(recipient, buildUpdatesWelcomeMessage(name));
}

export function buildWhatsAppFallbackLink(code: string): string {
  const businessPhone = formatWhatsAppRecipient(SITE_PHONES[0] ?? "7985831851");
  const text = encodeURIComponent(`Hi ${SITE_NAME}, my update verification code is ${code}`);
  return `https://wa.me/${businessPhone}?text=${text}`;
}
