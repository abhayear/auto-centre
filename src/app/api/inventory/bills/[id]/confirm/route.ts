import { Prisma } from "@prisma/client";
import { observeRoute } from "@/lib/health/observe-route";
import { NextResponse } from "next/server";
import { requireStaffSession } from "@/lib/auth";
import { canReceiveInventory } from "@/lib/inventory-access";
import { applyStockMovement, purchaseRateSnapshot } from "@/lib/inventory-stock";
import { prisma } from "@/lib/prisma";

async function postHandler(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = await requireStaffSession();
  if (!session?.user.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!canReceiveInventory(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await context.params;
  const bill = await prisma.purchaseBill.findUnique({
    where: { id },
    include: { lines: true },
  });
  if (!bill) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (bill.status !== "draft") {
    return NextResponse.json(
      { error: "Duplicate bill number for this portal" },
      { status: 409 },
    );
  }
  try {
    await prisma.$transaction(async (tx) => {
      for (const line of bill.lines) {
        const part = await tx.inventoryPart.findUnique({
          where: { id: line.inventoryPartId },
        });
        if (!part) continue;
        const catalog = await tx.portalCatalogLine.findFirst({
          where: { portalId: bill.portalId, inventoryPartId: part.id },
        });
        const rate = purchaseRateSnapshot({
          catalogRate: catalog ? Number(catalog.livePurchaseRate) : null,
          partPurchaseRate: Number(part.purchaseRate),
        });
        const movement = applyStockMovement(part.onHandQty, "receive", line.qty);
        await tx.purchaseBillLine.update({
          where: { id: line.id },
          data: { purchaseRateSnapshot: new Prisma.Decimal(rate) },
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
            billId: bill.id,
            actorEmail: session.user.email!,
          },
        });
      }
      await tx.purchaseBill.update({
        where: { id: bill.id },
        data: { status: "received", confirmedByEmail: session.user.email! },
      });
    });
    return NextResponse.json({ ok: true });
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

export const POST = observeRoute(postHandler);
