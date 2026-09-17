import { beforeEach, describe, expect, it, vi } from "vitest";

const { requireStaffSession, buyingPortalCreate, buyingPortalFindMany, buyingPortalUpsert, encryptPortalPassword } =
  vi.hoisted(() => ({
    requireStaffSession: vi.fn(),
    buyingPortalCreate: vi.fn(),
    buyingPortalFindMany: vi.fn(),
    buyingPortalUpsert: vi.fn(),
    encryptPortalPassword: vi.fn((value: string) => (value ? `enc:${value}` : "")),
  }));

vi.mock("@/lib/auth", () => ({ requireStaffSession }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    buyingPortal: { create: buyingPortalCreate, findMany: buyingPortalFindMany, upsert: buyingPortalUpsert },
  },
}));
vi.mock("@/lib/portal-password", () => ({ encryptPortalPassword }));
vi.mock("@/lib/health/observe-route", () => ({
  observeRoute: <T>(handler: T) => handler,
}));

import { GET, POST } from "@/app/api/inventory/portals/route";

describe("/api/inventory/portals", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    buyingPortalFindMany.mockResolvedValue([]);
    buyingPortalUpsert.mockResolvedValue({
      id: "p1",
      name: "Maple",
      websiteUrl: "https://example.com/maple",
      username: "shop",
      passwordEncrypted: "enc:secret",
      enabled: true,
      connectorId: null,
      lastSyncedAt: null,
      lastError: null,
    });
  });

  it("forbids purchasing from creating a portal", async () => {
    requireStaffSession.mockResolvedValue({
      user: { email: "buy@example.com", role: "purchasing" },
    });
    const response = await POST(
      new Request("https://example.com/api/inventory/portals", {
        method: "POST",
        body: JSON.stringify({
          name: "Maple",
          websiteUrl: "https://example.com/maple",
        }),
      }),
      undefined,
    );
    expect(response.status).toBe(403);
  });

  it("lets manager create a portal and encrypts the password", async () => {
    requireStaffSession.mockResolvedValue({
      user: { email: "mgr@example.com", role: "manager" },
    });
    const response = await POST(
      new Request("https://example.com/api/inventory/portals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Maple",
          websiteUrl: "https://example.com/maple",
          username: "shop",
          password: "secret",
        }),
      }),
      undefined,
    );
    expect(response.status).toBe(201);
    expect(encryptPortalPassword).toHaveBeenCalledWith("secret");
    expect(buyingPortalUpsert).toHaveBeenCalled();
    const json = await response.json();
    expect(json.passwordSaved).toBe(true);
    expect(json.password).toBeUndefined();
  });

  it("accepts a website without https", async () => {
    requireStaffSession.mockResolvedValue({
      user: { email: "mgr@example.com", role: "manager" },
    });
    const response = await POST(
      new Request("https://example.com/api/inventory/portals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Elyf EV Spare",
          websiteUrl: "elyfevspare.com",
          username: "shop",
          password: "secret",
        }),
      }),
      undefined,
    );
    expect(response.status).toBe(201);
    expect(buyingPortalUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          websiteUrl: "https://elyfevspare.com",
        }),
      }),
    );
  });

  it("lets manager save a supplier with only a name", async () => {
    requireStaffSession.mockResolvedValue({
      user: { email: "mgr@example.com", role: "manager" },
    });
    buyingPortalUpsert.mockResolvedValue({
      id: "p2",
      name: "R K Enterprises",
      websiteUrl: "",
      username: "",
      passwordEncrypted: "",
      enabled: true,
      connectorId: null,
      lastSyncedAt: null,
      lastError: null,
    });
    const response = await POST(
      new Request("https://example.com/api/inventory/portals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "R K Enterprises" }),
      }),
      undefined,
    );
    expect(response.status).toBe(201);
    expect(buyingPortalUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          name: "R K Enterprises",
          websiteUrl: "",
          username: "",
        }),
      }),
    );
  });

  it("lets manager list portals", async () => {
    requireStaffSession.mockResolvedValue({
      user: { email: "mgr@example.com", role: "manager" },
    });
    const response = await GET(
      new Request("https://example.com/api/inventory/portals"),
      undefined,
    );
    expect(response.status).toBe(200);
  });
});
