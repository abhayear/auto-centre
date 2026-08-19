import { afterEach, describe, expect, it, vi } from "vitest";

const { createTransport, sendMail } = vi.hoisted(() => ({
  createTransport: vi.fn(),
  sendMail: vi.fn(),
}));

vi.mock("nodemailer", () => ({
  default: { createTransport },
}));

import { sendHealthAlert } from "../../../scripts/send-health-alert.mjs";

describe("sendHealthAlert", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
    vi.resetAllMocks();
  });

  it("prints smtp_not_configured and completes successfully without credentials", async () => {
    vi.stubEnv("SMTP_USER", "");
    vi.stubEnv("SMTP_PASS", "");
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);
    const exit = vi.spyOn(process, "exit");

    await expect(sendHealthAlert()).resolves.toBe("smtp_not_configured");

    expect(log).toHaveBeenCalledWith("smtp_not_configured");
    expect(createTransport).not.toHaveBeenCalled();
    expect(exit).not.toHaveBeenCalled();
  });

  it("sends the site-down alert successfully", async () => {
    vi.stubEnv("SMTP_USER", "monitor@example.com");
    vi.stubEnv("SMTP_PASS", "app-password");
    sendMail.mockResolvedValue({ messageId: "message-1" });
    createTransport.mockReturnValue({ sendMail });
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);

    await expect(sendHealthAlert()).resolves.toBe("health_alert_sent");

    expect(sendMail).toHaveBeenCalledOnce();
    expect(log).toHaveBeenCalledWith("health_alert_sent");
  });

  it("prints smtp_error and completes successfully when sending fails", async () => {
    vi.stubEnv("SMTP_USER", "monitor@example.com");
    vi.stubEnv("SMTP_PASS", "app-password");
    sendMail.mockRejectedValue(new Error("SMTP unavailable"));
    createTransport.mockReturnValue({ sendMail });
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);
    const exit = vi.spyOn(process, "exit");

    await expect(sendHealthAlert()).resolves.toBe("smtp_error");

    expect(log).toHaveBeenCalledWith("smtp_error");
    expect(exit).not.toHaveBeenCalled();
  });
});
