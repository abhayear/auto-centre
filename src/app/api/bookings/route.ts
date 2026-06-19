import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { bookingSchema, bookingStatusSchema } from "@/lib/validators";

export async function GET(request: NextRequest) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const status = request.nextUrl.searchParams.get("status");

  const bookings = await prisma.serviceBooking.findMany({
    where: status ? { status } : undefined,
    include: { service: true },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(bookings);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const data = bookingSchema.parse(body);

    const booking = await prisma.serviceBooking.create({
      data: {
        customerName: data.customerName,
        email: data.email,
        phone: data.phone,
        vehicleInfo: data.vehicleInfo,
        serviceId: data.serviceId,
        preferredDate: new Date(data.preferredDate),
        preferredTime: data.preferredTime,
        notes: data.notes ?? null,
      },
      include: { service: true },
    });

    return NextResponse.json(booking, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json({ error: "Validation failed" }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to create booking" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { id, ...rest } = body;

    if (!id) {
      return NextResponse.json({ error: "Booking ID required" }, { status: 400 });
    }

    const { status } = bookingStatusSchema.parse(rest);

    const booking = await prisma.serviceBooking.update({
      where: { id },
      data: { status },
      include: { service: true },
    });

    return NextResponse.json(booking);
  } catch (error) {
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json({ error: "Validation failed" }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to update booking" }, { status: 500 });
  }
}
