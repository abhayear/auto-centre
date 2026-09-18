import { observeRoute } from "@/lib/health/observe-route";
import { NextResponse } from "next/server";
import { requireStaffSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { warrantyRoleForStaffRole } from "@/lib/warranty-roles";
import {
  buildWarrantyBoard,
  canUseWarrantyBoard,
  type WarrantyCase,
  type WarrantyStockRow,
} from "@/lib/warranty-workflow";

function dateOnly(value: Date | null | undefined): string | null {
  return value ? value.toISOString().slice(0, 10) : null;
}

async function getHandler(_request: Request) {
  const session = await requireStaffSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const warrantyRole = warrantyRoleForStaffRole(session.user.role);
  if (!warrantyRole || !canUseWarrantyBoard(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const [claimRows, stockRows] = await Promise.all([
    prisma.replacementClaim.findMany({
      orderBy: { receivedDate: "asc" },
      include: {
        items: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] },
        allocatedStock: { select: { id: true } },
      },
    }),
    prisma.replacementStockItem.findMany({ orderBy: { receivedDate: "asc" } }),
  ]);

  const claims: WarrantyCase[] = claimRows.map((claim) => ({
    id: claim.id,
    caseNumber: claim.caseNumber,
    customerName: claim.customerName,
    status: claim.status,
    destination: claim.destination,
    receivedDate: claim.receivedDate.toISOString().slice(0, 10),
    sentToCompanyDate: dateOnly(claim.sentToCompanyDate),
    companyInvoiceNumber: claim.companyInvoiceNumber,
    returnedToCustomerDate: dateOnly(claim.returnedToCustomerDate),
    allocatedStockId: claim.allocatedStock[0]?.id ?? null,
    items: claim.items.map((item) => ({
      itemType: item.itemType,
      side: item.side,
      modelCode: item.modelCode,
      serialNumber: item.serialNumber,
      quantity: item.quantity,
    })),
  }));

  const stockItems: WarrantyStockRow[] = stockRows.map((item) => ({
    id: item.id,
    itemType: item.itemType,
    modelCode: item.modelCode,
    serialNumber: item.serialNumber,
    status: item.status,
    receivedDate: item.receivedDate.toISOString().slice(0, 10),
    sourceClaimId: item.sourceClaimId,
    allocatedClaimId: item.allocatedClaimId,
    allocatedAt: item.allocatedAt ? item.allocatedAt.toISOString() : null,
  }));

  const today = new Date().toISOString().slice(0, 10);
  return NextResponse.json(buildWarrantyBoard(warrantyRole, claims, stockItems, today));
}

export const GET = observeRoute(getHandler);
