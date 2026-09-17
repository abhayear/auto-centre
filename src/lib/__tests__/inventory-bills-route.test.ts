import { Prisma } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

const prisma = vi.hoisted(() => ({
  requireStaffSession: vi.fn(),
  inventoryPartFindUnique: vi.fn(),
  portalCatalogLineFindFirst: vi.fn(),
  purchaseBillCreate: vi.fn(),
  inventoryPartUpdate: vi.fn(),
  stockMovementCreate: vi.fn(),
  transaction: vi.fn(),
  purchaseBillFindUnique: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ requireStaffSession: prisma.requireStaffSession }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    inventoryPart: {
      findUnique: prisma.inventoryPartFindUnique,
      update: prisma.inventoryPartUpdate,
    },
    portalCatalogLine: { findFirst: prisma.portalCatalogLineFindFirst },
    purchaseBill: {
      create: prisma.purchaseBillCreate,
      findUnique: prisma.purchaseBillFindUnique,
    },
    stockMovement: { create: prisma.stockMovementCreate },
    $transaction: prisma.transaction,
  },
}));
vi.mock("@/lib/health/observe-route", () => ({
  observeRoute: <T>(handler: T) => handler,
}));

import { POST } from "@/app/api/inventory/bills/route";
import { POST as CONFIRM } from "@/app/api/inventory/bills/[id]/confirm/route";

describe("/api/inventory/bills", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prisma.requireStaffSession.mockResolvedValue({
      user: { email: "buy@example.com", role: "purchasing" },
    });
    prisma.inventoryPartFindUnique.mockResolvedValue({
      id: "part-1",
      onHandQty: 2,
      purchaseRate: new Prisma.Decimal(10),
    });
    prisma.portalCatalogLineFindFirst.mockResolvedValue(null);
    prisma.transaction.mockImplementation(async (fn: (tx: Record<string, unknown>) => Promise<unknown>) => {
      const tx = {
        purchaseBill: { create: prisma.purchaseBillCreate, update: vi.fn() },
        inventoryPart: {
          update: prisma.inventoryPartUpdate,
          findUnique: prisma.inventoryPartFindUnique,
        },
        stockMovement: { create: prisma.stockMovementCreate },
        purchaseBillLine: { update: vi.fn() },
        portalCatalogLine: { findFirst: prisma.portalCatalogLineFindFirst },
      };
      return fn(tx);
    });
    prisma.purchaseBillCreate.mockResolvedValue({ id: "bill-1" });
  });

  it("increases qty on manual receive", async () => {
    const response = await POST(
      new Request("https://example.com/api/inventory/bills", {
        method: "POST",
        body: JSON.stringify({
          portalId: "portal-1",
          billNumber: "B-1",
          billDate: "2026-09-17",
          partId: "part-1",
          qty: 3,
        }),
      }),
      undefined,
    );
    expect(response.status).toBe(201);
    expect(prisma.inventoryPartUpdate).toHaveBeenCalledWith({
      where: { id: "part-1" },
      data: { onHandQty: 5 },
    });
    expect(prisma.stockMovementCreate).toHaveBeenCalled();
  });

  it("returns 409 on duplicate bill number", async () => {
    prisma.transaction.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("dup", {
        code: "P2002",
        clientVersion: "6.0.0",
      }),
    );
    const response = await POST(
      new Request("https://example.com/api/inventory/bills", {
        method: "POST",
        body: JSON.stringify({
          portalId: "portal-1",
          billNumber: "B-1",
          billDate: "2026-09-17",
          partId: "part-1",
          qty: 1,
        }),
      }),
      undefined,
    );
    expect(response.status).toBe(409);
  });

  it("increases qty on confirm of a draft bill", async () => {
    prisma.purchaseBillFindUnique.mockResolvedValue({
      id: "bill-1",
      status: "draft",
      portalId: "portal-1",
      lines: [{ id: "line-1", inventoryPartId: "part-1", qty: 3 }],
    });
    const response = await CONFIRM(
      new Request("https://example.com/api/inventory/bills/bill-1/confirm", {
        method: "POST",
      }),
      { params: Promise.resolve({ id: "bill-1" }) },
    );
    expect(response.status).toBe(200);
    expect(prisma.inventoryPartUpdate).toHaveBeenCalled();
  });
});
