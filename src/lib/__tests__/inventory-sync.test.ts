import { describe, expect, it, vi } from "vitest";
import { applyCatalogRateToPart, runBuyingPortalSync } from "@/lib/inventory-sync";

const { buyingPortalFindUnique, buyingPortalUpdate, inventoryPartUpdate } = vi.hoisted(() => ({
  buyingPortalFindUnique: vi.fn(),
  buyingPortalUpdate: vi.fn(),
  inventoryPartUpdate: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    buyingPortal: {
      findUnique: buyingPortalFindUnique,
      update: buyingPortalUpdate,
    },
    inventoryPart: { update: inventoryPartUpdate, findUnique: vi.fn() },
    portalCatalogLine: { upsert: vi.fn() },
    purchaseBill: { upsert: vi.fn() },
    $transaction: vi.fn(),
  },
}));

describe("applyCatalogRateToPart", () => {
  it("updates purchase rate only", () => {
    expect(
      applyCatalogRateToPart({ purchaseRate: 10, sellingPrice: 20 }, 15),
    ).toEqual({ purchaseRate: 15, sellingPrice: 20 });
  });
});

describe("runBuyingPortalSync", () => {
  it("does not change part qty or rates when there is no connector", async () => {
    buyingPortalFindUnique.mockResolvedValue({
      id: "p1",
      connectorId: null,
      websiteUrl: "https://example.com",
      username: "",
      passwordEncrypted: "",
    });
    buyingPortalUpdate.mockResolvedValue({});
    const result = await runBuyingPortalSync("p1");
    expect(result.ok).toBe(false);
    expect(result.lastError).toBe("No connector; use manual receive.");
    expect(inventoryPartUpdate).not.toHaveBeenCalled();
  });
});
