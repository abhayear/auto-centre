import { observeRoute } from "@/lib/health/observe-route";
import { NextResponse } from "next/server";
import { requireStaffSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { warrantyRoleForStaffRole } from "@/lib/warranty-roles";
import {
  DEFAULT_WARRANTY_POLICY,
  componentWarranty,
  isWarrantyCovered,
  type WarrantyPolicySettings,
} from "@/lib/component-warranty";
import {
  buildWarrantyBoard,
  canUseWarrantyBoard,
  type WarrantyCase,
  type WarrantyMasterCounts,
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
  const board = buildWarrantyBoard(warrantyRole, claims, stockItems, today);

  return NextResponse.json({ ...board, masterCounts: await masterCounts(today) });
}

const EMPTY_MASTER_COUNTS: WarrantyMasterCounts = {
  totalCustomers: 0,
  totalBikes: 0,
  componentsInWarranty: 0,
  warrantyExpiringSoon: 0,
};

async function masterCounts(today: string): Promise<WarrantyMasterCounts> {
  try {
    return await countRegistry(today);
  } catch {
    // Serial registry tables may not be migrated yet; the task board still works.
    return EMPTY_MASTER_COUNTS;
  }
}

async function countRegistry(today: string): Promise<WarrantyMasterCounts> {
  const [totalCustomers, totalBikes, components, policyRow] = await Promise.all([
    prisma.warrantyCustomer.count(),
    prisma.eBike.count(),
    prisma.warrantyComponent.findMany({
      where: { status: { in: ["installed", "available"] } },
      select: {
        componentType: true,
        warrantyMonths: true,
        warrantyStartDate: true,
        currentBike: {
          select: { saleDate: true, invoiceDate: true, warrantyStartBasis: true },
        },
      },
    }),
    prisma.warrantyPolicy.findUnique({ where: { id: "default" } }),
  ]);

  const policy: WarrantyPolicySettings = policyRow
    ? {
        batteryMonths: policyRow.batteryMonths,
        chargerMonths: policyRow.chargerMonths,
        motorMonths: policyRow.motorMonths,
        controllerMonths: policyRow.controllerMonths,
        startBasis: (policyRow.startBasis as WarrantyPolicySettings["startBasis"]) ?? "sale_date",
        expiringSoonDays: policyRow.expiringSoonDays,
      }
    : DEFAULT_WARRANTY_POLICY;

  let componentsInWarranty = 0;
  let warrantyExpiringSoon = 0;

  for (const component of components) {
    const result = componentWarranty(
      {
        componentType: component.componentType,
        warrantyMonths: component.warrantyMonths,
        warrantyStartDate: dateOnly(component.warrantyStartDate),
      },
      {
        saleDate: dateOnly(component.currentBike?.saleDate),
        invoiceDate: dateOnly(component.currentBike?.invoiceDate),
        warrantyStartBasis:
          (component.currentBike?.warrantyStartBasis as WarrantyPolicySettings["startBasis"]) ??
          null,
      },
      today,
      policy,
    );
    if (isWarrantyCovered(result)) componentsInWarranty += 1;
    if (result.status === "expiring_soon") warrantyExpiringSoon += 1;
  }

  return { totalCustomers, totalBikes, componentsInWarranty, warrantyExpiringSoon };
}

export const GET = observeRoute(getHandler);
