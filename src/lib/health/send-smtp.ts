import nodemailer from "nodemailer";

type HealthAlertEmail = {
  subject: string;
  text: string;
  html: string;
};

export type HealthAlertEmailResult = {
  sent: boolean;
  skipped?: string;
};

export async function sendHealthAlertEmail(
  email: HealthAlertEmail,
): Promise<HealthAlertEmailResult> {
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!user || !pass) {
    return { sent: false, skipped: "smtp_not_configured" };
  }

  try {
    const transport = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp.gmail.com",
      port: Number(process.env.SMTP_PORT || 465),
      secure: true,
      auth: { user, pass },
    });

    await transport.sendMail({
      to: process.env.ALERT_EMAIL || "mr.abhaysachan@gmail.com",
      from: process.env.ALERT_FROM || user,
      ...email,
    });

    return { sent: true };
  } catch {
    return { sent: false, skipped: "smtp_error" };
  }
}
