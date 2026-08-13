import { redirect } from "next/navigation";
import { InquiryPrintClient } from "@/components/inquiries/InquiryPrintClient";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseShowroomDateInput } from "@/lib/showroom-walk-ins";

type PageProps = {
  searchParams: Promise<{ status?: string; type?: string; from?: string; to?: string; auto?: string }>;
};

export default async function InquiriesPrintPage({ searchParams }: PageProps) {
  const session = await requireAdmin();
  if (!session) {
    redirect("/admin/login");
  }

  const { status, type, from, to, auto } = await searchParams;

  const createdAt: { gte?: Date; lte?: Date } = {};
  if (from) createdAt.gte = parseShowroomDateInput(from);
  if (to) {
    const end = parseShowroomDateInput(to);
    end.setUTCHours(23, 59, 59, 999);
    createdAt.lte = end;
  }

  const records = await prisma.inquiry.findMany({
    where: {
      ...(status ? { status } : {}),
      ...(type ? { type } : {}),
      ...(Object.keys(createdAt).length > 0 ? { createdAt } : {}),
    },
    include: { vehicle: true },
    orderBy: { createdAt: "desc" },
  });

  const inquiries = records.map((inquiry) => ({
    id: inquiry.id,
    type: inquiry.type,
    name: inquiry.name,
    email: inquiry.email,
    phone: inquiry.phone,
    message: inquiry.message,
    status: inquiry.status,
    createdAt: inquiry.createdAt.toISOString(),
    vehicleLabel: inquiry.vehicle
      ? `${inquiry.vehicle.year} ${inquiry.vehicle.make} ${inquiry.vehicle.model}`
      : null,
    bookingAmountAtBooking: inquiry.bookingAmountAtBooking,
    paymentStatus: inquiry.paymentStatus,
    refundAmountAtBooking: inquiry.refundAmountAtBooking,
  }));

  return (
    <InquiryPrintClient
      inquiries={inquiries}
      statusFilter={status}
      typeFilter={type}
      from={from}
      to={to}
      autoPrint={auto === "1"}
    />
  );
}
