import { Prisma } from "@prisma/client";
import { observeRoute } from "@/lib/health/observe-route";
import { NextResponse } from "next/server";
import { requireStaffSession } from "@/lib/auth";
import { canReceiveInventory } from "@/lib/inventory-access";
import { applyStockMovement, purchaseRateSnapshot } from "@/lib/inventory-stock";
import { prisma } from "@/lib/prisma";
import { manualReceiveSchema } from "@/lib/validators";

async function getHandler() {
  const session = await requireStaffSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!canReceiveInventory(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const bills = await prisma.purchaseBill.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { portal: true, lines: true },
  });
  const catalogLines = await prisma.portalCatalogLine.findMany({
    orderBy: { vendorSku: "asc" },
  });
  const portals = await prisma.buyingPortal.findMany({
    where: { enabled: true },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
  return NextResponse.json({ bills, catalogLines, portals });
}

async function postHandler(request: Request) {
  const session = await requireStaffSession();
  if (!session?.user.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!canReceiveInventory(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const parsed = manualReceiveSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed" }, { status: 400 });
  }
  const part = await prisma.inventoryPart.findUnique({
    where: { id: parsed.data.partId },
  });
  if (!part) {
    return NextResponse.json({ error: "Part not found" }, { status: 404 });
  }
  const catalog = await prisma.portalCatalogLine.findFirst({
    where: { portalId: parsed.data.portalId, inventoryPartId: part.id },
  });
  const rate = purchaseRateSnapshot({
    catalogRate: catalog ? Number(catalog.livePurchaseRate) : null,
    partPurchaseRate: Number(part.purchaseRate),
  });
  const movement = applyStockMovement(part.onHandQty, "receive", parsed.data.qty);
  try {
    const bill = await prisma.$transaction(async (tx) => {
      const created = await tx.purchaseBill.create({
        data: {
          portalId: parsed.data.portalId,
          billNumber: parsed.data.billNumber,
          billDate: new Date(`${parsed.data.billDate}T00:00:00.000Z`),
          source: "manual",
          status: "received",
          confirmedByEmail: session.user.email!,
          lines: {
            create: {
              inventoryPartId: part.id,
              qty: parsed.data.qty,
              purchaseRateSnapshot: new Prisma.Decimal(rate),
            },
          },
        },
      });
      await tx.inventoryPart.update({
        where: { id: part.id },
        data: { onHandQty: movement.qtyAfter },
      });
      await tx.stockMovement.create({
        data: {
          partId: part.id,
          kind: "receive",
          qtyDelta: movement.qtyDelta,
          qtyAfter: movement.qtyAfter,
          billId: created.id,
          actorEmail: session.user.email!,
        },
      });
      return created;
    });
    return NextResponse.json(bill, { status: 201 });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { error: "Duplicate bill number for this portal" },
        { status: 409 },
      );
    }
    throw error;
  }
}

export const GET = observeRoute(getHandler);
export const POST = observeRoute(postHandler);
