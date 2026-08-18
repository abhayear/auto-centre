import type { AlertEmailItem } from "@/lib/health/alert-policy";
import type { MetricStatus } from "@/lib/system-health";

const LINKS = [
  "Cloud Vitals: https://autogalaxy.in/admin/cloud-vitals",
  "Vercel: https://vercel.com/dashboard",
  "Neon: https://console.neon.tech",
].join("\n");

export function buildAlertEmail(input: {
  items: AlertEmailItem[];
  digest: boolean;
  overallStatus: MetricStatus;
  siteUrl: string;
}): { subject: string; text: string; html: string } {
  const first = input.items[0]?.signal;
  const recoveredOnly =
    input.items.length > 0 && input.items.every((item) => item.kind === "recovered");
  const firstCritical = input.items.find((item) => item.signal.status === "critical")?.signal;
  const firstWarning = input.items.find((item) => item.signal.status === "warning")?.signal;

  let subject: string;
  if (input.digest) {
    subject = "[Auto Galaxy] Daily health digest";
  } else if (recoveredOnly && first) {
    subject = `[Auto Galaxy] Recovered: ${first.label}`;
  } else if (firstCritical) {
    subject = `[Auto Galaxy] CRITICAL: ${firstCritical.label}`;
  } else if (firstWarning) {
    subject = `[Auto Galaxy] WARNING: ${firstWarning.label}`;
  } else {
    subject = "[Auto Galaxy] WARNING: health";
  }

  const blocks = input.items.map((item) => {
    const recoveredNote =
      item.kind === "recovered" ? "\nno further action unless it returns." : "";
    return [
      `${item.signal.label} (${item.kind})`,
      `Status: ${item.signal.status}`,
      `Value: ${item.signal.value}`,
      `Threshold: ${item.signal.threshold}`,
      `Suggested action: ${item.signal.suggestedAction}${recoveredNote}`,
    ].join("\n");
  });

  const text = [
    `Overall: ${input.overallStatus}`,
    `Site: ${input.siteUrl}`,
    "",
    ...blocks,
    "",
    LINKS,
  ].join("\n");

  const html = `<pre style="font-family:sans-serif;white-space:pre-wrap">${text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")}</pre>`;

  return { subject, text, html };
}
