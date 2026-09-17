import { Prisma } from "@prisma/client";
import { observeRoute } from "@/lib/health/observe-route";
import { NextResponse } from "next/server";
import { requireStaffSession } from "@/lib/auth";
import {
  canIssueInventory,
  canReceiveInventory,
  canWriteInventoryRates,
} from "@/lib/inventory-access";
import { rejectRateFieldsIfLocked } from "@/lib/inventory-stock";
import { prisma } from "@/lib/prisma";
import {
  createInventoryPartNameOnlySchema,
  upsertInventoryPartSchema,
} from "@/lib/validators";

function serializePart(part: {
  id: string;
  code: string;
  name: string;
  onHandQty: number;
  purchaseRate: Prisma.Decimal;
  sellingPrice: Prisma.Decimal;
}) {
  return {
    id: part.id,
    code: part.code,
    name: part.name,
    onHandQty: part.onHandQty,
    purchaseRate: Number(part.purchaseRate),
    sellingPrice: Number(part.sellingPrice),
  };
}

async function getHandler(_request: Request) {
  const session = await requireStaffSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!canReceiveInventory(session.user.role) && !canIssueInventory(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const parts = await prisma.inventoryPart.findMany({ orderBy: { code: "asc" } });
  return NextResponse.json(parts.map(serializePart));
}

async function postHandler(request: Request) {
  const session = await requireStaffSession();
  if (!session?.user.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!canReceiveInventory(session.user.role) && !canWriteInventoryRates(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = (await request.json()) as Record<string, unknown>;
  const locked = rejectRateFieldsIfLocked(session.user.role, body);
  if (locked) {
    return NextResponse.json({ error: locked }, { status: 403 });
  }
  if (canWriteInventoryRates(session.user.role)) {
    const parsed = upsertInventoryPartSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed" }, { status: 400 });
    }
    const part = await prisma.inventoryPart.create({
      data: {
        code: parsed.data.code,
        name: parsed.data.name,
        purchaseRate: new Prisma.Decimal(parsed.data.purchaseRate ?? 0),
        sellingPrice: new Prisma.Decimal(parsed.data.sellingPrice ?? 0),
      },
    });
    return NextResponse.json(serializePart(part), { status: 201 });
  }
  const parsed = createInventoryPartNameOnlySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed" }, { status: 400 });
  }
  const part = await prisma.inventoryPart.create({
    data: {
      code: parsed.data.code,
      name: parsed.data.name,
      purchaseRate: new Prisma.Decimal(0),
      sellingPrice: new Prisma.Decimal(0),
    },
  });
  return NextResponse.json(serializePart(part), { status: 201 });
}

export const GET = observeRoute(getHandler);
export const POST = observeRoute(postHandler);
