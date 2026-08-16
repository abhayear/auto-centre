import { redirect } from "next/navigation";
import { MovementReportPrintClient } from "@/components/replacement-parts/MovementReportPrintClient";
import { ReplacementPartsPrintClient } from "@/components/replacement-parts/ReplacementPartsPrintClient";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  LETTER_ELIGIBLE_STATUSES,
  isMovementReportKind,
  parseReplacementDateInput,
  serializeReplacementClaim,
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
  const session = await requireAdmin();
  if (!session) {
    redirect("/admin/login");
  }

  const { from, to, auto, ids, letter, report, itemType } = await searchParams;
  const reportKind = isMovementReportKind(report) ? report : null;
  const isStageReport = reportKind != null;

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

  const records = await prisma.replacementClaim.findMany({
    where: Object.keys(where).length > 0 ? where : undefined,
    include: {
      items: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] },
    },
    orderBy: [{ receivedDate: "asc" }, { createdAt: "asc" }],
  });

  const claims = records.map(serializeReplacementClaim);

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
