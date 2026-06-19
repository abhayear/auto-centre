import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { bookingStatusSchema } from "@/lib/validators";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const body = await request.json();
    const { status } = bookingStatusSchema.parse(body);

    const booking = await prisma.serviceBooking.update({
      where: { id },
      data: { status },
      include: { service: true },
    });

    return NextResponse.json(booking);
  } catch {
    return NextResponse.json({ error: "Failed to update booking" }, { status: 500 });
  }
}
