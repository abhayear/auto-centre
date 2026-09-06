import { redirect } from "next/navigation";
import { MovementReportPrintClient } from "@/components/replacement-parts/MovementReportPrintClient";
import { ReplacementPartsPrintClient } from "@/components/replacement-parts/ReplacementPartsPrintClient";
import { WarrantySummaryPrintClient } from "@/components/replacement-parts/WarrantySummaryPrintClient";
import { requireStaffSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  LETTER_ELIGIBLE_STATUSES,
  isMovementReportKind,
  parseReplacementDateInput,
  serializeReplacementClaim,
  serializeReplacementStockItem,
  type SerializedReplacementStockItem,
} from "@/lib/replacement-parts";

type PageProps = {
  searchParams: Promise<{
    from?: string;
    to?: string;
    auto?: string;
    ids?: string;
    letter?: string;
    report?: string;
    itemType?: string;
  }>;
};

export default async function ReplacementPartsPrintPage({ searchParams }: PageProps) {
  const session = await requireStaffSession();
  if (!session) {
    redirect("/admin/login");
  }

  const { from, to, auto, ids, letter, report, itemType } = await searchParams;
  const isSummaryReport = report === "summary";
  const reportKind = isMovementReportKind(report) ? report : null;
  const isStageReport = reportKind != null || isSummaryReport;

  const receivedDate: { gte?: Date; lte?: Date } = {};
  if (from) receivedDate.gte = parseReplacementDateInput(from);
  if (to) receivedDate.lte = parseReplacementDateInput(to);

  const idList = ids
    ? ids
        .split(",")
        .map((id) => id.trim())
        .filter(Boolean)
    : [];

  const where: {
    id?: { in: string[] };
    receivedDate?: { gte?: Date; lte?: Date };
    status?: { in: string[] };
    items?: { some: { itemType: string; side: string } };
  } = {};

  if (idList.length > 0) {
    where.id = { in: idList };
  } else {
    if (Object.keys(receivedDate).length > 0) {
      where.receivedDate = receivedDate;
    }
    if (letter === "1" && !isStageReport) {
      where.status = { in: [...LETTER_ELIGIBLE_STATUSES] };
    }
  }

  if (itemType) {
    where.items = { some: { itemType, side: "old" } };
  }

  const listWhere = Object.keys(where).length > 0 ? where : undefined;
  const listOrder = [{ receivedDate: "asc" as const }, { createdAt: "asc" as const }];
  const itemsInclude = {
    items: { orderBy: [{ sortOrder: "asc" as const }, { createdAt: "asc" as const }] },
  };
  let records;
  try {
    records = await prisma.replacementClaim.findMany({
      where: listWhere,
      include: { ...itemsInclude, sourcedStock: true, allocatedStock: true },
      orderBy: listOrder,
    });
  } catch {
    records = await prisma.replacementClaim.findMany({
      where: listWhere,
      include: itemsInclude,
      orderBy: listOrder,
    });
  }

  const claims = records.map(serializeReplacementClaim);

  if (isSummaryReport) {
    let stock: SerializedReplacementStockItem[] = [];
    try {
      stock = (await prisma.replacementStockItem.findMany()).map(serializeReplacementStockItem);
    } catch {
      stock = [];
    }

    return (
      <WarrantySummaryPrintClient
        claims={claims}
        stock={stock}
        from={from}
        to={to}
      />
    );
  }

  if (reportKind) {
    return (
      <MovementReportPrintClient
        claims={claims}
        from={from}
        to={to}
        autoPrint={auto === "1"}
        kind={reportKind}
      />
    );
  }

  return (
    <ReplacementPartsPrintClient
      claims={claims}
      from={from}
      to={to}
      autoPrint={auto === "1"}
    />
  );
}
