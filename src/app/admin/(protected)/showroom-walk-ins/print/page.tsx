import { redirect } from "next/navigation";
import { ShowroomWalkInPrintClient } from "@/components/showroom-walk-ins/ShowroomWalkInPrintClient";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseShowroomDateInput, serializeShowroomWalkIn } from "@/lib/showroom-walk-ins";

type PageProps = {
  searchParams: Promise<{ from?: string; to?: string; auto?: string }>;
};

export default async function ShowroomWalkInsPrintPage({ searchParams }: PageProps) {
  const session = await requireAdmin();
  if (!session) {
    redirect("/admin/login");
  }

  const { from, to, auto } = await searchParams;

  const enquiryDate: { gte?: Date; lte?: Date } = {};
  if (from) enquiryDate.gte = parseShowroomDateInput(from);
  if (to) enquiryDate.lte = parseShowroomDateInput(to);

  const records = await prisma.showroomWalkIn.findMany({
    where: Object.keys(enquiryDate).length > 0 ? { enquiryDate } : undefined,
    orderBy: [{ enquiryDate: "desc" }, { createdAt: "desc" }],
  });

  const enquiries = records.map(serializeShowroomWalkIn);

  return (
    <ShowroomWalkInPrintClient
      enquiries={enquiries}
      from={from}
      to={to}
      autoPrint={auto === "1"}
    />
  );
}
