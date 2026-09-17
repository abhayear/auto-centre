import { beforeEach, describe, expect, it, vi } from "vitest";
import { Prisma } from "@prisma/client";

const { requireStaffSession, inventoryPartCreate, inventoryPartFindMany, inventoryPartFindUnique, inventoryPartUpdate, rateChangeLogCreate, transaction } =
  vi.hoisted(() => ({
    requireStaffSession: vi.fn(),
    inventoryPartCreate: vi.fn(),
    inventoryPartFindMany: vi.fn(),
    inventoryPartFindUnique: vi.fn(),
    inventoryPartUpdate: vi.fn(),
    rateChangeLogCreate: vi.fn(),
    transaction: vi.fn(),
  }));

vi.mock("@/lib/auth", () => ({ requireStaffSession }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    inventoryPart: {
      create: inventoryPartCreate,
      findMany: inventoryPartFindMany,
      findUnique: inventoryPartFindUnique,
      update: inventoryPartUpdate,
    },
    rateChangeLog: { create: rateChangeLogCreate },
    $transaction: transaction,
  },
}));
vi.mock("@/lib/health/observe-route", () => ({
  observeRoute: <T>(handler: T) => handler,
}));

import { GET, POST } from "@/app/api/inventory/parts/route";
import { PATCH } from "@/app/api/inventory/parts/[id]/route";

describe("/api/inventory/parts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    inventoryPartFindMany.mockResolvedValue([]);
    inventoryPartCreate.mockImplementation(async ({ data }: { data: { code: string; name: string; purchaseRate: Prisma.Decimal; sellingPrice: Prisma.Decimal } }) => ({
      id: "part-1",
      code: data.code,
      name: data.name,
      onHandQty: 0,
      purchaseRate: data.purchaseRate,
      sellingPrice: data.sellingPrice,
    }));
  });

  it("lets purchasing list parts", async () => {
    requireStaffSession.mockResolvedValue({
      user: { email: "buy@example.com", role: "purchasing" },
    });
    const response = await GET(
      new Request("https://example.com/api/inventory/parts"),
      undefined,
    );
    expect(response.status).toBe(200);
  });

  it("rejects purchasing part create with a rate", async () => {
    requireStaffSession.mockResolvedValue({
      user: { email: "buy@example.com", role: "purchasing" },
    });
    const response = await POST(
      new Request("https://example.com/api/inventory/parts", {
        method: "POST",
        body: JSON.stringify({ code: "A", name: "Axle", purchaseRate: 10 }),
      }),
      undefined,
    );
    expect(response.status).toBe(403);
  });

  it("lets purchasing create a name-only part at rate 0", async () => {
    requireStaffSession.mockResolvedValue({
      user: { email: "buy@example.com", role: "purchasing" },
    });
    const response = await POST(
      new Request("https://example.com/api/inventory/parts", {
        method: "POST",
        body: JSON.stringify({ code: "A", name: "Axle" }),
      }),
      undefined,
    );
    expect(response.status).toBe(201);
    const json = await response.json();
    expect(json.purchaseRate).toBe(0);
    expect(json.sellingPrice).toBe(0);
  });

  it("rejects store rate patches", async () => {
    requireStaffSession.mockResolvedValue({
      user: { email: "store@example.com", role: "store" },
    });
    const response = await PATCH(
      new Request("https://example.com/api/inventory/parts/part-1", {
        method: "PATCH",
        body: JSON.stringify({ sellingPrice: 99 }),
      }),
      { params: Promise.resolve({ id: "part-1" }) },
    );
    expect(response.status).toBe(403);
  });

  it("lets manager patch selling price and write a rate log", async () => {
    requireStaffSession.mockResolvedValue({
      user: { email: "mgr@example.com", role: "manager" },
    });
    inventoryPartFindUnique.mockResolvedValue({
      id: "part-1",
      code: "A",
      name: "Axle",
      onHandQty: 0,
      purchaseRate: new Prisma.Decimal(1),
      sellingPrice: new Prisma.Decimal(2),
    });
    transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) =>
      fn({
        inventoryPart: {
          update: vi.fn().mockResolvedValue({
            id: "part-1",
            code: "A",
            name: "Axle",
            onHandQty: 0,
            purchaseRate: new Prisma.Decimal(1),
            sellingPrice: new Prisma.Decimal(9),
          }),
        },
        rateChangeLog: { create: rateChangeLogCreate },
      }),
    );
    const response = await PATCH(
      new Request("https://example.com/api/inventory/parts/part-1", {
        method: "PATCH",
        body: JSON.stringify({ sellingPrice: 9 }),
      }),
      { params: Promise.resolve({ id: "part-1" }) },
    );
    expect(response.status).toBe(200);
    expect(rateChangeLogCreate).toHaveBeenCalled();
  });
});
