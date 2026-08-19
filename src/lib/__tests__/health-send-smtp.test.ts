import { afterEach, describe, expect, it, vi } from "vitest";

const { createTransport, sendMail } = vi.hoisted(() => ({
  createTransport: vi.fn(),
  sendMail: vi.fn(),
}));

vi.mock("nodemailer", () => ({
  default: { createTransport },
}));

import { sendHealthAlertEmail } from "@/lib/health/send-smtp";

const email = {
  subject: "Auto Galaxy health alert",
  text: "Health alert",
  html: "<p>Health alert</p>",
};

describe("sendHealthAlertEmail", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });

  it("skips sending when SMTP credentials are missing", async () => {
    vi.stubEnv("SMTP_USER", "");
    vi.stubEnv("SMTP_PASS", "");

    await expect(sendHealthAlertEmail(email)).resolves.toEqual({
      sent: false,
      skipped: "smtp_not_configured",
    });
    expect(createTransport).not.toHaveBeenCalled();
  });

  it("sends with the configured defaults", async () => {
    vi.stubEnv("SMTP_USER", "monitor@example.com");
    vi.stubEnv("SMTP_PASS", "app-password");
    vi.stubEnv("SMTP_HOST", "");
    vi.stubEnv("SMTP_PORT", "");
    vi.stubEnv("ALERT_EMAIL", "");
    vi.stubEnv("ALERT_FROM", "");
    sendMail.mockResolvedValue({ messageId: "message-1" });
    createTransport.mockReturnValue({ sendMail });

    await expect(sendHealthAlertEmail(email)).resolves.toEqual({ sent: true });
    expect(createTransport).toHaveBeenCalledWith({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: { user: "monitor@example.com", pass: "app-password" },
    });
    expect(sendMail).toHaveBeenCalledWith({
      to: "mr.abhaysachan@gmail.com",
      from: "monitor@example.com",
      ...email,
    });
  });

  it("returns smtp_error when transport sending fails", async () => {
    vi.stubEnv("SMTP_USER", "monitor@example.com");
    vi.stubEnv("SMTP_PASS", "app-password");
    sendMail.mockRejectedValue(new Error("SMTP unavailable"));
    createTransport.mockReturnValue({ sendMail });

    await expect(sendHealthAlertEmail(email)).resolves.toEqual({
      sent: false,
      skipped: "smtp_error",
    });
  });
});
