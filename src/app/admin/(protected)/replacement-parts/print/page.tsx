import { redirect } from "next/navigation";
import { ReplacementPartsPrintClient } from "@/components/replacement-parts/ReplacementPartsPrintClient";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  LETTER_ELIGIBLE_STATUSES,
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
  }>;
};

export default async function ReplacementPartsPrintPage({ searchParams }: PageProps) {
  const session = await requireAdmin();
  if (!session) {
    redirect("/admin/login");
  }

  const { from, to, auto, ids, letter } = await searchParams;

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
  } = {};

  if (idList.length > 0) {
    where.id = { in: idList };
  } else {
    if (Object.keys(receivedDate).length > 0) {
      where.receivedDate = receivedDate;
    }
    if (letter === "1") {
      where.status = { in: [...LETTER_ELIGIBLE_STATUSES] };
    }
  }

  const records = await prisma.replacementClaim.findMany({
    where: Object.keys(where).length > 0 ? where : undefined,
    include: {
      items: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] },
    },
    orderBy: [{ receivedDate: "asc" }, { createdAt: "asc" }],
  });

  const claims = records.map(serializeReplacementClaim);

  return (
    <ReplacementPartsPrintClient
      claims={claims}
      from={from}
      to={to}
      autoPrint={auto === "1"}
    />
  );
}
