import { observeRoute } from "@/lib/health/observe-route";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireOpsPortal } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  filterAtShowroomClaims,
  filterPendingFromCompanyClaims,
  filterReadyForCustomerClaims,
  isReadyForCustomer,
  parseReplacementDateInput,
  serializeReplacementClaim,
  serializeReplacementStockItem,
} from "@/lib/replacement-parts";
import {
  formatZodErrors,
  replacementAllocateSchema,
  replacementClaimSchema,
  replacementCompanyReceiptSchema,
  replacementReturnToCustomerSchema,
  replacementSendToCompanySchema,
  replacementStatusUpdateSchema,
} from "@/lib/validators";
import { nextWarrantyCaseNumber } from "@/lib/warranty-allocation";

const claimInclude = {
  items: { orderBy: [{ sortOrder: "asc" as const }, { createdAt: "asc" as const }] },
  sourcedStock: true,
  allocatedStock: true,
};

async function nextCaseNumber() {
  const latest = await prisma.replacementClaim.findFirst({
    where: { caseNumber: { startsWith: "WC-" } },
    orderBy: { caseNumber: "desc" },
    select: { caseNumber: true },
  });
  return nextWarrantyCaseNumber(latest?.caseNumber ? [latest.caseNumber] : []);
}

async function backfillCaseNumbers() {
  const missing = await prisma.replacementClaim.findMany({
    where: { caseNumber: null },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
  if (missing.length === 0) return;

  let next = await nextCaseNumber();
  for (const row of missing) {
    await prisma.replacementClaim.update({
      where: { id: row.id },
      data: { caseNumber: next },
    });
    next = nextWarrantyCaseNumber([next]);
  }
}

function buildListFilter(params: {
  from?: string | null;
  to?: string | null;
  status?: string | null;
  itemType?: string | null;
  pendingFromCompany?: string | null;
  pendingAtShowroom?: string | null;
  readyForCustomer?: string | null;
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

  if (params.pendingAtShowroom === "1") {
    where.status = "received_from_customer";
  } else if (params.readyForCustomer === "1") {
    where.status = { in: ["received_from_customer", "sent_to_company", "received_from_company"] };
  } else if (params.pendingFromCompany === "1") {
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
  returnedToCustomerDate?: string | null;
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
    ...(data.returnedToCustomerDate !== undefined
      ? { returnedToCustomerDate: optionalDateInput(data.returnedToCustomerDate) }
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
    billDate: optionalDateInput(data.billDate),
    warrantyMonths: data.warrantyMonths ?? null,
    fault: data.fault?.trim() || null,
    destination: data.destination ?? null,
    status: data.status,
    sentToCompanyDate,
    companyReceivedDate: optionalDateInput(data.companyReceivedDate),
    companyInvoiceNumber: data.companyInvoiceNumber?.trim() || null,
    companyDeliveryNote: data.companyDeliveryNote?.trim() || null,
    returnedToCustomerDate: optionalDateInput(data.returnedToCustomerDate),
    notes: data.notes?.trim() || null,
    items: {
      create: toItemCreateData(data.items),
    },
  };
}

 async function getHandler(request: NextRequest) {
  const session = await requireOpsPortal();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const status = searchParams.get("status");
  const itemType = searchParams.get("itemType");
  const pendingFromCompany = searchParams.get("pendingFromCompany");
  const pendingAtShowroom = searchParams.get("pendingAtShowroom");
  const readyForCustomer = searchParams.get("readyForCustomer");

  await backfillCaseNumbers();

  if (searchParams.get("stock") === "1") {
    const stock = await prisma.replacementStockItem.findMany({
      orderBy: [{ receivedDate: "asc" }, { createdAt: "asc" }],
    });
    return NextResponse.json(stock.map(serializeReplacementStockItem));
  }

  const records = await prisma.replacementClaim.findMany({
    where: buildListFilter({
      from,
      to,
      status,
      itemType,
      pendingFromCompany,
      pendingAtShowroom,
      readyForCustomer,
    }),
    include: claimInclude,
    orderBy: [{ receivedDate: "desc" }, { createdAt: "desc" }],
  });

  const serialized = records.map(serializeReplacementClaim);

  if (pendingAtShowroom === "1") {
    return NextResponse.json(filterAtShowroomClaims(serialized));
  }

  if (readyForCustomer === "1") {
    return NextResponse.json(filterReadyForCustomerClaims(serialized));
  }

  if (pendingFromCompany === "1") {
    return NextResponse.json(filterPendingFromCompanyClaims(serialized));
  }

  return NextResponse.json(serialized);
}

 async function postHandler(request: NextRequest) {
  const session = await requireOpsPortal();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const data = replacementClaimSchema.parse(body);

    const record = await prisma.replacementClaim.create({
      data: {
        ...toCreateData(data),
        caseNumber: await nextCaseNumber(),
      },
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

 async function patchHandler(request: NextRequest) {
  const session = await requireOpsPortal();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();

    if (body.sendToCompany) {
      const sendData = replacementSendToCompanySchema.parse(body);
      const sentToCompanyDate = parseReplacementDateInput(sendData.sentToCompanyDate);
      const courierNote = sendData.courierNote?.trim();

      const existing = await prisma.replacementClaim.findMany({
        where: { id: { in: sendData.ids } },
      });

      const eligible = existing.filter((claim) => claim.status === "received_from_customer");
      if (eligible.length === 0) {
        return NextResponse.json(
          { error: "No showroom items selected to send. Only items still at the showroom can be sent." },
          { status: 400 },
        );
      }

      await prisma.$transaction(
        eligible.map((claim) =>
          prisma.replacementClaim.update({
            where: { id: claim.id },
            data: {
              status: "sent_to_company",
              sentToCompanyDate,
              destination: sendData.destination,
              ...(courierNote
                ? {
                    notes: [claim.notes, `Courier: ${courierNote}`].filter(Boolean).join("\n"),
                  }
                : {}),
            },
          }),
        ),
      );

      const updated = await prisma.replacementClaim.findMany({
        where: { id: { in: eligible.map((claim) => claim.id) } },
        include: claimInclude,
      });

      return NextResponse.json({
        updated: eligible.length,
        claims: updated.map(serializeReplacementClaim),
      });
    }

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

      const fullyReceived = newQty >= oldQty;
      const result = receiptData.result;
      const rejected = result === "rejected";
      const handoverNow = Boolean(receiptData.returnToCustomerNow) && fullyReceived && !rejected;
      const nextStatus = handoverNow
        ? "returned_to_customer"
        : fullyReceived
          ? "received_from_company"
          : existing.status === "sent_to_company"
            ? "received_from_company"
            : existing.status;
      const source = existing.destination === "plant" ? "plant" : "company";
      const receivedDate = parseReplacementDateInput(receiptData.companyReceivedDate);

      const record = await prisma.$transaction(async (tx) => {
        const updated = await tx.replacementClaim.update({
          where: { id: receiptData.id },
          data: {
            companyReceivedDate: receivedDate,
            companyInvoiceNumber: receiptData.companyInvoiceNumber?.trim() || null,
            companyDeliveryNote: receiptData.companyDeliveryNote?.trim() || null,
            status: nextStatus,
            ...(handoverNow
              ? {
                  returnedToCustomerDate: parseReplacementDateInput(
                    receiptData.returnedToCustomerDate ?? receiptData.companyReceivedDate,
                  ),
                }
              : {}),
            items: { create: newItems },
          },
        });

        const createdStock = [];
        for (const item of receiptData.items) {
          const quantity = item.quantity || 1;
          for (let unit = 0; unit < quantity; unit += 1) {
            createdStock.push(
              await tx.replacementStockItem.create({
                data: {
                  itemType: item.itemType,
                  modelCode: item.modelCode?.trim() || null,
                  serialNumber: item.serialNumber?.trim() || null,
                  ah: item.itemType === "battery" ? (item.ah ?? null) : null,
                  voltage: item.itemType === "charger" ? (item.voltage ?? null) : null,
                  result,
                  source,
                  sourceClaimId: updated.id,
                  status: rejected ? "rejected" : handoverNow ? "allocated" : "available",
                  receivedDate,
                  allocatedClaimId: handoverNow ? updated.id : null,
                  allocatedAt: handoverNow ? new Date() : null,
                  notes: item.notes?.trim() || null,
                },
              }),
            );
          }
        }

        void createdStock;
        return tx.replacementClaim.findUniqueOrThrow({
          where: { id: updated.id },
          include: claimInclude,
        });
      });

      return NextResponse.json(serializeReplacementClaim(record));
    }

    if (body.allocateStock) {
      const allocateData = replacementAllocateSchema.parse(body);
      const [claim, stock] = await Promise.all([
        prisma.replacementClaim.findUnique({
          where: { id: allocateData.claimId },
          include: claimInclude,
        }),
        prisma.replacementStockItem.findUnique({
          where: { id: allocateData.stockId },
        }),
      ]);

      if (!claim) {
        return NextResponse.json({ error: "Claim not found" }, { status: 404 });
      }
      if (!stock) {
        return NextResponse.json({ error: "Stock item not found" }, { status: 404 });
      }
      if (["returned_to_customer", "closed", "cancelled"].includes(claim.status)) {
        return NextResponse.json({ error: "This warranty case is already closed" }, { status: 400 });
      }
      if (stock.status !== "available") {
        return NextResponse.json({ error: "That stock item is no longer available" }, { status: 400 });
      }

      await prisma.replacementStockItem.update({
        where: { id: stock.id },
        data: {
          status: "allocated",
          allocatedClaimId: claim.id,
          allocatedAt: new Date(),
        },
      });

      const updated = await prisma.replacementClaim.findUniqueOrThrow({
        where: { id: claim.id },
        include: claimInclude,
      });
      return NextResponse.json(serializeReplacementClaim(updated));
    }

    if (body.returnToCustomer) {
      const returnData = replacementReturnToCustomerSchema.parse(body);
      const returnedToCustomerDate = parseReplacementDateInput(returnData.returnedToCustomerDate);
      const handoverNote = returnData.handoverNote?.trim();

      const existing = await prisma.replacementClaim.findMany({
        where: { id: { in: returnData.ids } },
        include: claimInclude,
      });

      const eligible = existing.filter((claim) => isReadyForCustomer(serializeReplacementClaim(claim)));

      if (eligible.length === 0) {
        return NextResponse.json(
          {
            error:
              "No items ready to return. Record the company receipt first, then hand over to the customer.",
          },
          { status: 400 },
        );
      }

      await prisma.$transaction(
        eligible.map((claim) =>
          prisma.replacementClaim.update({
            where: { id: claim.id },
            data: {
              status: "returned_to_customer",
              returnedToCustomerDate,
              ...(handoverNote
                ? {
                    notes: [claim.notes, `Returned to customer: ${handoverNote}`]
                      .filter(Boolean)
                      .join("\n"),
                  }
                : {}),
            },
          }),
        ),
      );

      const updated = await prisma.replacementClaim.findMany({
        where: { id: { in: eligible.map((claim) => claim.id) } },
        include: claimInclude,
      });

      return NextResponse.json({
        updated: eligible.length,
        claims: updated.map(serializeReplacementClaim),
      });
    }

    if (body.status && !body.items && Object.keys(body).length <= 2) {
      const statusData = replacementStatusUpdateSchema.parse(body);
      const updateData: {
        status: string;
        sentToCompanyDate?: Date;
        returnedToCustomerDate?: Date;
      } = {
        status: statusData.status,
      };

      if (statusData.status === "sent_to_company") {
        updateData.sentToCompanyDate = new Date();
        updateData.sentToCompanyDate.setUTCHours(0, 0, 0, 0);
      }

      if (statusData.status === "returned_to_customer") {
        updateData.returnedToCustomerDate = new Date();
        updateData.returnedToCustomerDate.setUTCHours(0, 0, 0, 0);
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
          ...(data.billDate !== undefined ? { billDate: optionalDateInput(data.billDate) } : {}),
          ...(data.warrantyMonths !== undefined ? { warrantyMonths: data.warrantyMonths ?? null } : {}),
          ...(data.fault !== undefined ? { fault: data.fault?.trim() || null } : {}),
          ...(data.destination !== undefined ? { destination: data.destination ?? null } : {}),
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

 async function deleteHandler(request: NextRequest) {
  const session = await requireOpsPortal();
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

export const GET = observeRoute(getHandler);
export const POST = observeRoute(postHandler);
export const PATCH = observeRoute(patchHandler);
export const DELETE = observeRoute(deleteHandler);
