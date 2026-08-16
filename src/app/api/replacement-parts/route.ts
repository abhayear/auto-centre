import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  filterPendingFromCompanyClaims,
  parseReplacementDateInput,
  serializeReplacementClaim,
} from "@/lib/replacement-parts";
import {
  formatZodErrors,
  replacementClaimSchema,
  replacementCompanyReceiptSchema,
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
  pendingFromCompany?: string | null;
}) {
  const where: {
    receivedDate?: { gte?: Date; lte?: Date };
    status?: string | { in: string[] };
    items?: { some: { itemType: string; side: string } };
  } = {};

  if (params.from || params.to) {
    where.receivedDate = {};
    if (params.from) where.receivedDate.gte = parseReplacementDateInput(params.from);
    if (params.to) where.receivedDate.lte = parseReplacementDateInput(params.to);
  }

  if (params.pendingFromCompany === "1") {
    where.status = { in: ["sent_to_company", "received_from_company"] };
  } else if (params.status) {
    where.status = params.status;
  }

  if (params.itemType) {
    where.items = { some: { itemType: params.itemType, side: "old" } };
  }

  return Object.keys(where).length > 0 ? where : undefined;
}

function optionalDateInput(value: string | null | undefined): Date | null {
  if (!value) return null;
  return parseReplacementDateInput(value);
}

function companyReceiptFields(data: {
  sentToCompanyDate?: string | null;
  companyReceivedDate?: string | null;
  companyInvoiceNumber?: string | null;
  companyDeliveryNote?: string | null;
}) {
  return {
    ...(data.sentToCompanyDate !== undefined
      ? { sentToCompanyDate: optionalDateInput(data.sentToCompanyDate) }
      : {}),
    ...(data.companyReceivedDate !== undefined
      ? { companyReceivedDate: optionalDateInput(data.companyReceivedDate) }
      : {}),
    ...(data.companyInvoiceNumber !== undefined
      ? { companyInvoiceNumber: data.companyInvoiceNumber?.trim() || null }
      : {}),
    ...(data.companyDeliveryNote !== undefined
      ? { companyDeliveryNote: data.companyDeliveryNote?.trim() || null }
      : {}),
  };
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
  const sentToCompanyDate =
    data.status === "sent_to_company"
      ? optionalDateInput(data.sentToCompanyDate ?? data.receivedDate)
      : optionalDateInput(data.sentToCompanyDate);

  return {
    receivedDate: parseReplacementDateInput(data.receivedDate),
    customerName: data.customerName.trim(),
    customerPhone: data.customerPhone?.trim() || null,
    billNumber: data.billNumber?.trim() || null,
    status: data.status,
    sentToCompanyDate,
    companyReceivedDate: optionalDateInput(data.companyReceivedDate),
    companyInvoiceNumber: data.companyInvoiceNumber?.trim() || null,
    companyDeliveryNote: data.companyDeliveryNote?.trim() || null,
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
  const pendingFromCompany = searchParams.get("pendingFromCompany");

  const records = await prisma.replacementClaim.findMany({
    where: buildListFilter({ from, to, status, itemType, pendingFromCompany }),
    include: claimInclude,
    orderBy: [{ receivedDate: "desc" }, { createdAt: "desc" }],
  });

  const serialized = records.map(serializeReplacementClaim);

  if (pendingFromCompany === "1") {
    return NextResponse.json(filterPendingFromCompanyClaims(serialized));
  }

  return NextResponse.json(serialized);
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

    if (body.recordCompanyReceipt) {
      const receiptData = replacementCompanyReceiptSchema.parse(body);
      const existing = await prisma.replacementClaim.findUnique({
        where: { id: receiptData.id },
        include: claimInclude,
      });

      if (!existing) {
        return NextResponse.json({ error: "Claim not found" }, { status: 404 });
      }

      const newItems = toItemCreateData(
        receiptData.items.map((item) => ({ ...item, side: "new" as const })),
      ).map((item, index) => ({
        ...item,
        sortOrder: existing.items.length + index,
      }));

      const oldQty = existing.items
        .filter((item) => item.side === "old")
        .reduce((total, item) => total + item.quantity, 0);
      const newQty =
        existing.items
          .filter((item) => item.side === "new")
          .reduce((total, item) => total + item.quantity, 0) +
        receiptData.items.reduce((total, item) => total + item.quantity, 0);

      const nextStatus =
        newQty >= oldQty ? "received_from_company" : existing.status === "sent_to_company"
          ? "received_from_company"
          : existing.status;

      const record = await prisma.replacementClaim.update({
        where: { id: receiptData.id },
        data: {
          companyReceivedDate: parseReplacementDateInput(receiptData.companyReceivedDate),
          companyInvoiceNumber: receiptData.companyInvoiceNumber?.trim() || null,
          companyDeliveryNote: receiptData.companyDeliveryNote?.trim() || null,
          status: nextStatus,
          items: { create: newItems },
        },
        include: claimInclude,
      });

      return NextResponse.json(serializeReplacementClaim(record));
    }

    if (body.status && !body.items && Object.keys(body).length <= 2) {
      const statusData = replacementStatusUpdateSchema.parse(body);
      const updateData: { status: string; sentToCompanyDate?: Date } = {
        status: statusData.status,
      };

      if (statusData.status === "sent_to_company") {
        updateData.sentToCompanyDate = new Date();
        updateData.sentToCompanyDate.setUTCHours(0, 0, 0, 0);
      }

      const record = await prisma.replacementClaim.update({
        where: { id: statusData.id },
        data: updateData,
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
          ...(data.status !== undefined
            ? {
                status: data.status,
                ...(data.status === "sent_to_company" && data.sentToCompanyDate === undefined
                  ? {
                      sentToCompanyDate: (() => {
                        const date = new Date();
                        date.setUTCHours(0, 0, 0, 0);
                        return date;
                      })(),
                    }
                  : {}),
              }
            : {}),
          ...companyReceiptFields(data),
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
