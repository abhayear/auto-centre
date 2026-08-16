import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  parseReplacementDateInput,
  serializeReplacementClaim,
} from "@/lib/replacement-parts";
import {
  formatZodErrors,
  replacementClaimSchema,
  replacementStatusUpdateSchema,
} from "@/lib/validators";

const claimInclude = {
  items: { orderBy: [{ sortOrder: "asc" as const }, { createdAt: "asc" as const }] },
};

function buildListFilter(params: {
  from?: string | null;
  to?: string | null;
  status?: string | null;
  itemType?: string | null;
}) {
  const where: {
    receivedDate?: { gte?: Date; lte?: Date };
    status?: string;
    items?: { some: { itemType: string; side: string } };
  } = {};

  if (params.from || params.to) {
    where.receivedDate = {};
    if (params.from) where.receivedDate.gte = parseReplacementDateInput(params.from);
    if (params.to) where.receivedDate.lte = parseReplacementDateInput(params.to);
  }

  if (params.status) {
    where.status = params.status;
  }

  if (params.itemType) {
    where.items = { some: { itemType: params.itemType, side: "old" } };
  }

  return Object.keys(where).length > 0 ? where : undefined;
}

function toItemCreateData(
  items: z.infer<typeof replacementClaimSchema>["items"],
) {
  return items.map((item, index) => ({
    itemType: item.itemType,
    side: item.side,
    modelCode: item.modelCode?.trim() || null,
    serialNumber: item.serialNumber?.trim() || null,
    ah: item.itemType === "battery" ? (item.ah ?? null) : null,
    voltage: item.itemType === "charger" ? (item.voltage ?? null) : null,
    quantity: item.quantity,
    notes: item.notes?.trim() || null,
    sortOrder: item.sortOrder ?? index,
  }));
}

function toCreateData(data: z.infer<typeof replacementClaimSchema>) {
  return {
    receivedDate: parseReplacementDateInput(data.receivedDate),
    customerName: data.customerName.trim(),
    customerPhone: data.customerPhone?.trim() || null,
    billNumber: data.billNumber?.trim() || null,
    status: data.status,
    notes: data.notes?.trim() || null,
    items: {
      create: toItemCreateData(data.items),
    },
  };
}

export async function GET(request: NextRequest) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const status = searchParams.get("status");
  const itemType = searchParams.get("itemType");

  const records = await prisma.replacementClaim.findMany({
    where: buildListFilter({ from, to, status, itemType }),
    include: claimInclude,
    orderBy: [{ receivedDate: "desc" }, { createdAt: "desc" }],
  });

  return NextResponse.json(records.map(serializeReplacementClaim));
}

export async function POST(request: NextRequest) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const data = replacementClaimSchema.parse(body);

    const record = await prisma.replacementClaim.create({
      data: toCreateData(data),
      include: claimInclude,
    });

    return NextResponse.json(serializeReplacementClaim(record), { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: formatZodErrors(error) },
        { status: 400 },
      );
    }
    return NextResponse.json({ error: "Failed to create replacement claim" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();

    if (body.status && !body.items && Object.keys(body).length <= 2) {
      const statusData = replacementStatusUpdateSchema.parse(body);
      const record = await prisma.replacementClaim.update({
        where: { id: statusData.id },
        data: { status: statusData.status },
        include: claimInclude,
      });
      return NextResponse.json(serializeReplacementClaim(record));
    }

    const { id, ...rest } = body;
    if (!id) {
      return NextResponse.json({ error: "Claim ID required" }, { status: 400 });
    }

    const data = replacementClaimSchema.partial().parse(rest);

    const record = await prisma.$transaction(async (tx) => {
      if (data.items) {
        await tx.replacementClaimItem.deleteMany({ where: { claimId: id } });
      }

      return tx.replacementClaim.update({
        where: { id },
        data: {
          ...(data.receivedDate
            ? { receivedDate: parseReplacementDateInput(data.receivedDate) }
            : {}),
          ...(data.customerName !== undefined
            ? { customerName: data.customerName.trim() }
            : {}),
          ...(data.customerPhone !== undefined
            ? { customerPhone: data.customerPhone?.trim() || null }
            : {}),
          ...(data.billNumber !== undefined
            ? { billNumber: data.billNumber?.trim() || null }
            : {}),
          ...(data.status !== undefined ? { status: data.status } : {}),
          ...(data.notes !== undefined ? { notes: data.notes?.trim() || null } : {}),
          ...(data.items
            ? { items: { create: toItemCreateData(data.items) } }
            : {}),
        },
        include: claimInclude,
      });
    });

    return NextResponse.json(serializeReplacementClaim(record));
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: formatZodErrors(error) },
        { status: 400 },
      );
    }
    return NextResponse.json({ error: "Failed to update replacement claim" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const idsParam = request.nextUrl.searchParams.get("ids");
  if (idsParam) {
    const ids = idsParam.split(",").map((id) => id.trim()).filter(Boolean);
    if (ids.length === 0) {
      return NextResponse.json({ error: "No claim IDs provided" }, { status: 400 });
    }

    try {
      const result = await prisma.replacementClaim.deleteMany({
        where: { id: { in: ids } },
      });
      return NextResponse.json({ success: true, deleted: result.count });
    } catch {
      return NextResponse.json({ error: "Failed to delete replacement claims" }, { status: 500 });
    }
  }

  const id = request.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Claim ID required" }, { status: 400 });
  }

  try {
    await prisma.replacementClaim.delete({ where: { id } });
    return NextResponse.json({ success: true, deleted: 1 });
  } catch {
    return NextResponse.json({ error: "Failed to delete replacement claim" }, { status: 500 });
  }
}
