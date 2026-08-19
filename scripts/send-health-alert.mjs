import nodemailer from "nodemailer";

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
  process.exit(0);
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
