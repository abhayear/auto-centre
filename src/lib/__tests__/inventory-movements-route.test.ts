import { Prisma } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireStaffSession: vi.fn(),
  inventoryPartFindUnique: vi.fn(),
  inventoryPartUpdate: vi.fn(),
  stockMovementCreate: vi.fn(),
  stockCountCreate: vi.fn(),
  transaction: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ requireStaffSession: mocks.requireStaffSession }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    inventoryPart: {
      findUnique: mocks.inventoryPartFindUnique,
      update: mocks.inventoryPartUpdate,
    },
    stockMovement: { create: mocks.stockMovementCreate },
    stockCount: { create: mocks.stockCountCreate },
    $transaction: mocks.transaction,
  },
}));
vi.mock("@/lib/health/observe-route", () => ({
  observeRoute: <T>(handler: T) => handler,
}));

import { POST } from "@/app/api/inventory/movements/route";

describe("/api/inventory/movements", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.inventoryPartFindUnique.mockResolvedValue({
      id: "part-1",
      onHandQty: 4,
      purchaseRate: new Prisma.Decimal(1),
      sellingPrice: new Prisma.Decimal(2),
    });
    mocks.transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) =>
      fn({
        inventoryPart: { update: mocks.inventoryPartUpdate },
        stockMovement: { create: mocks.stockMovementCreate },
        stockCount: { create: mocks.stockCountCreate },
      }),
    );
    mocks.inventoryPartUpdate.mockResolvedValue({ id: "part-1", onHandQty: 3 });
    mocks.stockMovementCreate.mockResolvedValue({ id: "m1" });
  });

  it("forbids purchasing from issuing stock", async () => {
    mocks.requireStaffSession.mockResolvedValue({
      user: { email: "buy@example.com", role: "purchasing" },
    });
    const response = await POST(
      new Request("https://example.com/api/inventory/movements", {
        method: "POST",
        body: JSON.stringify({ kind: "issue", partId: "part-1", qty: 1 }),
      }),
      undefined,
    );
    expect(response.status).toBe(403);
  });

  it("lets store issue stock and decrease qty", async () => {
    mocks.requireStaffSession.mockResolvedValue({
      user: { email: "store@example.com", role: "store" },
    });
    const response = await POST(
      new Request("https://example.com/api/inventory/movements", {
        method: "POST",
        body: JSON.stringify({ kind: "issue", partId: "part-1", qty: 1 }),
      }),
      undefined,
    );
    expect(response.status).toBe(201);
    expect(mocks.inventoryPartUpdate).toHaveBeenCalledWith({
      where: { id: "part-1" },
      data: { onHandQty: 3 },
    });
  });
});
