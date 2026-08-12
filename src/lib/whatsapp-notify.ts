import { SITE_PHONES } from "@/lib/constants";
import { normalizeIndianPhone } from "@/lib/razorpay-checkout";
import { getSiteUrl } from "@/lib/site-url";

const WHATSAPP_GRAPH_API = "https://graph.facebook.com/v21.0";

export type JobApplicationNotifyPayload = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  trackingCode: string;
  job: {
    title: string;
    department: string;
    location: string;
  };
};

export function isWhatsAppConfigured(): boolean {
  return Boolean(
    process.env.WHATSAPP_ACCESS_TOKEN?.trim() &&
      process.env.WHATSAPP_PHONE_NUMBER_ID?.trim(),
  );
}

/** Digits only with country code (91 for India). */
export function formatWhatsAppRecipient(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("91") && digits.length === 12) {
    return digits;
  }
  const local = normalizeIndianPhone(phone);
  if (local) {
    return `91${local}`;
  }
  return digits;
}

function getNotifyNumbers(): string[] {
  const fromEnv = process.env.WHATSAPP_NOTIFY_NUMBERS?.trim();
  if (fromEnv) {
    return fromEnv
      .split(",")
      .map((entry) => formatWhatsAppRecipient(entry.trim()))
      .filter(Boolean);
  }
  return SITE_PHONES.map((phone) => formatWhatsAppRecipient(phone));
}

export function buildJobApplicationWhatsAppMessage(
  application: JobApplicationNotifyPayload,
): string {
  const adminUrl = `${getSiteUrl()}/admin/job-applications/${application.id}`;
  const lines = [
    "New job application",
    "",
    `Role: ${application.job.title}`,
    `Department: ${application.job.department}`,
    `Location: ${application.job.location}`,
    "",
    `Name: ${application.name}`,
    `Email: ${application.email}`,
  ];

  if (application.phone) {
    lines.push(`Phone: ${application.phone}`);
  }

  lines.push(
    `Tracking: ${application.trackingCode}`,
    "",
    `Review: ${adminUrl}`,
  );

  return lines.join("\n");
}

export async function sendWhatsAppText(
  to: string,
  text: string,
): Promise<{ ok: boolean; error?: string }> {
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN?.trim();
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID?.trim();

  if (!accessToken || !phoneNumberId) {
    return { ok: false, error: "WhatsApp is not configured" };
  }

  const recipient = formatWhatsAppRecipient(to);
  if (!recipient) {
    return { ok: false, error: "Invalid recipient phone number" };
  }

  try {
    const response = await fetch(
      `${WHATSAPP_GRAPH_API}/${phoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: recipient,
          type: "text",
          text: { body: text },
        }),
      },
    );

    if (!response.ok) {
      const body = await response.text();
      return { ok: false, error: `WhatsApp API ${response.status}: ${body}` };
    }

    return { ok: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return { ok: false, error: message };
  }
}

export async function notifyJobApplication(
  application: JobApplicationNotifyPayload,
): Promise<void> {
  if (!isWhatsAppConfigured()) {
    return;
  }

  const message = buildJobApplicationWhatsAppMessage(application);
  const recipients = getNotifyNumbers();

  await Promise.all(
    recipients.map(async (recipient) => {
      const result = await sendWhatsAppText(recipient, message);
      if (!result.ok) {
        console.error(
          `WhatsApp notification failed for ${recipient}:`,
          result.error,
        );
      }
    }),
  );
}
