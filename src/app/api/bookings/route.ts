import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { STORE_LOCATION } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { checkLocationServiceability, type ServiceCentreConfig } from "@/lib/service-areas";
import { bookingSchema, bookingStatusSchema, formatZodErrors } from "@/lib/validators";

const defaultCentre: ServiceCentreConfig = {
  latitude: STORE_LOCATION.lat,
  longitude: STORE_LOCATION.lng,
  radiusKm: 25,
  radiusCheckEnabled: true,
  label: "Auto Galaxy Service Centre",
};

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

    const [areas, centreRow] = await Promise.all([
      prisma.serviceArea.findMany({
        where: { active: true },
        select: { name: true, pinCode: true, active: true },
      }),
      prisma.serviceCentreConfig.findUnique({ where: { id: "default" } }),
    ]);

    const centre = centreRow ?? defaultCentre;

    const areaCheck = checkLocationServiceability(
      {
        area: data.customerArea,
        locality: data.locality,
        sublocality: data.sublocality,
        postalCode: data.postalCode,
        formattedAddress: data.customerAddress,
        lat: data.latitude,
        lng: data.longitude,
      },
      areas,
      centre
    );

    if (!areaCheck.serviceable) {
      const message =
        areaCheck.method === "radius" && areaCheck.distanceKm != null
          ? `Your location is ${areaCheck.distanceKm} km away — outside our ${centre.radiusKm} km service radius.`
          : "This area is not in our service coverage. Please check your locality or contact us.";

      return NextResponse.json({ error: message }, { status: 400 });
    }

    const booking = await prisma.serviceBooking.create({
      data: {
        customerName: data.customerName,
        email: data.email,
        phone: data.phone,
        customerArea: areaCheck.matchedArea ?? data.customerArea,
        customerAddress: data.customerAddress ?? null,
        latitude: data.latitude ?? null,
        longitude: data.longitude ?? null,
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
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: formatZodErrors(error) },
        { status: 400 }
      );
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
