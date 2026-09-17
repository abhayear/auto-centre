import { observeRoute } from "@/lib/health/observe-route";
import { NextResponse } from "next/server";
import { requireStaffSession } from "@/lib/auth";
import { canIssueInventory } from "@/lib/inventory-access";
import { applyStockMovement } from "@/lib/inventory-stock";
import { prisma } from "@/lib/prisma";
import { stockActionSchema } from "@/lib/validators";

async function postHandler(request: Request) {
  const session = await requireStaffSession();
  if (!session?.user.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!canIssueInventory(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const parsed = stockActionSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed" }, { status: 400 });
  }
  const part = await prisma.inventoryPart.findUnique({
    where: { id: parsed.data.partId },
  });
  if (!part) {
    return NextResponse.json({ error: "Part not found" }, { status: 404 });
  }
  const movement = applyStockMovement(part.onHandQty, parsed.data.kind, parsed.data.qty);
  const result = await prisma.$transaction(async (tx) => {
    const updated = await tx.inventoryPart.update({
      where: { id: part.id },
      data: { onHandQty: movement.qtyAfter },
    });
    const row = await tx.stockMovement.create({
      data: {
        partId: part.id,
        kind: parsed.data.kind,
        qtyDelta: movement.qtyDelta,
        qtyAfter: movement.qtyAfter,
        jobRef: parsed.data.jobRef,
        note: parsed.data.note,
        actorEmail: session.user.email!,
      },
    });
    if (parsed.data.kind === "count") {
      await tx.stockCount.create({
        data: {
          partId: part.id,
          physicalQty: parsed.data.qty,
          systemQty: part.onHandQty,
          actorEmail: session.user.email!,
        },
      });
    }
    return { part: updated, movement: row };
  });
  return NextResponse.json(result, { status: 201 });
}

export const POST = observeRoute(postHandler);
