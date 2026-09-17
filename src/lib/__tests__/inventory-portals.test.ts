import { describe, expect, it } from "vitest";
import { SEED_BUYING_PORTALS, serializeBuyingPortal } from "@/lib/inventory-portals";

describe("SEED_BUYING_PORTALS", () => {
  it("seeds the six buying portals from the spec", () => {
    expect(SEED_BUYING_PORTALS.map((p) => p.name)).toEqual([
      "Elyf EV Spare",
      "Vishal Bearing House",
      "Maple",
      "Komaki",
      "E Indiabull",
      "R K Enterprises",
    ]);
  });
});

describe("serializeBuyingPortal", () => {
  it("exposes passwordSaved and never a password field", () => {
    const publicPortal = serializeBuyingPortal({
      id: "p1",
      name: "Maple",
      websiteUrl: "https://example.com/maple",
      username: "shop",
      passwordEncrypted: "abc",
      enabled: true,
      connectorId: null,
      lastSyncedAt: null,
      lastError: null,
    });
    expect(publicPortal.passwordSaved).toBe(true);
    expect(publicPortal).not.toHaveProperty("password");
    expect(publicPortal).not.toHaveProperty("passwordEncrypted");
  });

  it("marks empty encrypted password as not saved", () => {
    const publicPortal = serializeBuyingPortal({
      id: "p2",
      name: "Maple",
      websiteUrl: "https://example.com/maple",
      username: "",
      passwordEncrypted: "",
      enabled: true,
      connectorId: null,
      lastSyncedAt: null,
      lastError: null,
    });
    expect(publicPortal.passwordSaved).toBe(false);
  });
});
