import nodemailer from "nodemailer";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

export async function sendHealthAlert() {
  const {
    ALERT_EMAIL,
    ALERT_FROM,
    ALERT_SUBJECT,
    ALERT_TEXT,
    SMTP_HOST,
    SMTP_PASS,
    SMTP_PORT,
    SMTP_USER,
  } = process.env;

  if (!SMTP_USER || !SMTP_PASS) {
    console.log("smtp_not_configured");
    return "smtp_not_configured";
  }

  const subject =
    ALERT_SUBJECT || "[Auto Galaxy] CRITICAL: Site availability";
  const text =
    ALERT_TEXT ||
    [
      "Value: probe failed",
      "Suggested action: Check the latest Vercel deployment and DNS for autogalaxy.in. Confirm `/api/health`.",
      "",
      "Cloud Vitals: https://autogalaxy.in/admin/cloud-vitals",
    ].join("\n");

  try {
    const transport = nodemailer.createTransport({
      host: SMTP_HOST || "smtp.gmail.com",
      port: Number(SMTP_PORT || 465),
      secure: true,
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS,
      },
    });

    await transport.sendMail({
      to: ALERT_EMAIL || "mr.abhaysachan@gmail.com",
      from: ALERT_FROM || SMTP_USER,
      subject,
      text,
    });

    console.log("health_alert_sent");
    return "health_alert_sent";
  } catch {
    console.log("smtp_error");
    return "smtp_error";
  }
}

const isMain =
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href;

if (isMain) {
  await sendHealthAlert();
}
