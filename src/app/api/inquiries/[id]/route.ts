import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { inquiryStatusSchema } from "@/lib/validators";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;

  const inquiry = await prisma.inquiry.findUnique({
    where: { id },
    include: {
      vehicle: {
        select: {
          year: true,
          make: true,
          model: true,
        },
      },
    },
  });

  if (!inquiry || inquiry.type !== "test_drive") {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  }

  if (inquiry.paymentStatus !== "pending" && inquiry.paymentStatus !== "paid" && inquiry.paymentStatus !== "not_required") {
    return NextResponse.json({ error: "Booking not available" }, { status: 404 });
  }

  return NextResponse.json({
    id: inquiry.id,
    name: inquiry.name,
    email: inquiry.email,
    phone: inquiry.phone,
    message: inquiry.message,
    paymentStatus: inquiry.paymentStatus,
    bookingAmountAtBooking: inquiry.bookingAmountAtBooking,
    refundAmountAtBooking: inquiry.refundAmountAtBooking,
    vehicleLabel: inquiry.vehicle
      ? `${inquiry.vehicle.year} ${inquiry.vehicle.make} ${inquiry.vehicle.model}`
      : null,
    createdAt: inquiry.createdAt,
  });
}

export async function PATCH(request: Request, { params }: Params) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const body = await request.json();
    const { status } = inquiryStatusSchema.parse(body);

    const inquiry = await prisma.inquiry.update({
      where: { id },
      data: { status },
      include: { vehicle: true },
    });

    return NextResponse.json(inquiry);
  } catch {
    return NextResponse.json({ error: "Failed to update inquiry" }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    await prisma.inquiry.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete inquiry" }, { status: 500 });
  }
}
