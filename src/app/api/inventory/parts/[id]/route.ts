import { Prisma } from "@prisma/client";
import { observeRoute } from "@/lib/health/observe-route";
import { NextResponse } from "next/server";
import { requireStaffSession } from "@/lib/auth";
import { canWriteInventoryRates } from "@/lib/inventory-access";
import { rejectRateFieldsIfLocked } from "@/lib/inventory-stock";
import { prisma } from "@/lib/prisma";
import { patchInventoryPartRatesSchema } from "@/lib/validators";

async function patchHandler(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = await requireStaffSession();
  if (!session?.user.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = (await request.json()) as Record<string, unknown>;
  const locked = rejectRateFieldsIfLocked(session.user.role, body);
  if (locked) {
    return NextResponse.json({ error: locked }, { status: 403 });
  }
  if (!canWriteInventoryRates(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const parsed = patchInventoryPartRatesSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed" }, { status: 400 });
  }
  const { id } = await context.params;
  const existing = await prisma.inventoryPart.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const logs: {
    field: string;
    oldValue: Prisma.Decimal;
    newValue: Prisma.Decimal;
  }[] = [];
  const data: {
    name?: string;
    code?: string;
    purchaseRate?: Prisma.Decimal;
    sellingPrice?: Prisma.Decimal;
  } = {};
  if (parsed.data.name !== undefined) data.name = parsed.data.name;
  if (parsed.data.code !== undefined) data.code = parsed.data.code;
  if (parsed.data.purchaseRate !== undefined) {
    data.purchaseRate = new Prisma.Decimal(parsed.data.purchaseRate);
    logs.push({
      field: "purchaseRate",
      oldValue: existing.purchaseRate,
      newValue: data.purchaseRate,
    });
  }
  if (parsed.data.sellingPrice !== undefined) {
    data.sellingPrice = new Prisma.Decimal(parsed.data.sellingPrice);
    logs.push({
      field: "sellingPrice",
      oldValue: existing.sellingPrice,
      newValue: data.sellingPrice,
    });
  }
  const part = await prisma.$transaction(async (tx) => {
    const updated = await tx.inventoryPart.update({ where: { id }, data });
    for (const log of logs) {
      await tx.rateChangeLog.create({
        data: {
          partId: id,
          field: log.field,
          oldValue: log.oldValue,
          newValue: log.newValue,
          source: "manager_override",
          actorEmail: session.user.email!,
        },
      });
    }
    return updated;
  });
  return NextResponse.json({
    id: part.id,
    code: part.code,
    name: part.name,
    onHandQty: part.onHandQty,
    purchaseRate: Number(part.purchaseRate),
    sellingPrice: Number(part.sellingPrice),
  });
}

export const PATCH = observeRoute(patchHandler);
