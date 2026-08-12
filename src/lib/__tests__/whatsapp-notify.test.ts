import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildJobApplicationWhatsAppMessage,
  formatWhatsAppRecipient,
  isWhatsAppConfigured,
  sendWhatsAppText,
} from "../whatsapp-notify";

const sampleApplication = {
  id: "app123",
  name: "Jane Doe",
  email: "jane@example.com",
  phone: "7985831851",
  trackingCode: "AG-ABC123",
  job: {
    title: "Service Technician",
    department: "Service",
    location: "Lalitpur",
  },
};

describe("formatWhatsAppRecipient", () => {
  it("formats 10-digit Indian numbers with 91 prefix", () => {
    expect(formatWhatsAppRecipient("7985831851")).toBe("917985831851");
    expect(formatWhatsAppRecipient("+91 79858 31851")).toBe("917985831851");
  });

  it("preserves numbers already including country code", () => {
    expect(formatWhatsAppRecipient("917985831851")).toBe("917985831851");
  });
});

describe("isWhatsAppConfigured", () => {
  afterEach(() => {
    delete process.env.WHATSAPP_ACCESS_TOKEN;
    delete process.env.WHATSAPP_PHONE_NUMBER_ID;
  });

  it("returns false when env vars are missing", () => {
    expect(isWhatsAppConfigured()).toBe(false);
  });

  it("returns true when both env vars are set", () => {
    process.env.WHATSAPP_ACCESS_TOKEN = "test-token";
    process.env.WHATSAPP_PHONE_NUMBER_ID = "123456789";
    expect(isWhatsAppConfigured()).toBe(true);
  });
});

describe("buildJobApplicationWhatsAppMessage", () => {
  it("includes job, candidate, tracking code, and admin link", () => {
    process.env.NEXTAUTH_URL = "https://autogalaxy.in";

    const message = buildJobApplicationWhatsAppMessage(sampleApplication);

    expect(message).toContain("New job application");
    expect(message).toContain("Service Technician");
    expect(message).toContain("Jane Doe");
    expect(message).toContain("jane@example.com");
    expect(message).toContain("7985831851");
    expect(message).toContain("AG-ABC123");
    expect(message).toContain("https://autogalaxy.in/admin/job-applications/app123");
  });

  it("omits phone line when not provided", () => {
    const message = buildJobApplicationWhatsAppMessage({
      ...sampleApplication,
      phone: null,
    });

    expect(message).not.toContain("Phone:");
  });
});

describe("sendWhatsAppText", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.WHATSAPP_ACCESS_TOKEN;
    delete process.env.WHATSAPP_PHONE_NUMBER_ID;
  });

  it("returns error when not configured", async () => {
    const result = await sendWhatsAppText("7985831851", "Hello");
    expect(result.ok).toBe(false);
    expect(result.error).toBe("WhatsApp is not configured");
  });

  it("calls WhatsApp Graph API when configured", async () => {
    process.env.WHATSAPP_ACCESS_TOKEN = "test-token";
    process.env.WHATSAPP_PHONE_NUMBER_ID = "phone-id-123";

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => "",
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await sendWhatsAppText("7985831851", "Hello");

    expect(result.ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://graph.facebook.com/v21.0/phone-id-123/messages",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer test-token",
        }),
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: "917985831851",
          type: "text",
          text: { body: "Hello" },
        }),
      }),
    );
  });

  it("returns API error on failure", async () => {
    process.env.WHATSAPP_ACCESS_TOKEN = "test-token";
    process.env.WHATSAPP_PHONE_NUMBER_ID = "phone-id-123";

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        text: async () => "Bad request",
      }),
    );

    const result = await sendWhatsAppText("7985831851", "Hello");

    expect(result.ok).toBe(false);
    expect(result.error).toContain("WhatsApp API 400");
  });
});
