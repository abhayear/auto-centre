import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { STORE_LOCATION } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { checkLocationServiceability, type ServiceCentreConfig } from "@/lib/service-areas";
import { formatZodErrors, serviceAreaCheckSchema } from "@/lib/validators";

const defaultCentre: ServiceCentreConfig = {
  latitude: STORE_LOCATION.lat,
  longitude: STORE_LOCATION.lng,
  radiusKm: 25,
  radiusCheckEnabled: true,
  label: "Auto Galaxy Service Centre",
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const data = serviceAreaCheckSchema.parse(body);

    const [areas, centreRow] = await Promise.all([
      prisma.serviceArea.findMany({
        where: { active: true },
        select: { name: true, pinCode: true, active: true },
      }),
      prisma.serviceCentreConfig.findUnique({ where: { id: "default" } }),
    ]);

    const centre: ServiceCentreConfig = centreRow ?? defaultCentre;

    const result = checkLocationServiceability(
      {
        area: data.area,
        locality: data.locality,
        sublocality: data.sublocality,
        postalCode: data.postalCode,
        formattedAddress: data.formattedAddress,
        adminArea: data.adminArea,
        lat: data.lat,
        lng: data.lng,
      },
      areas,
      centre
    );

    if (!result.serviceable) {
      const radiusMessage =
        result.method === "radius" && result.distanceKm != null
          ? `Your location is ${result.distanceKm} km from our service centre. We currently serve within ${centre.radiusKm} km only.`
          : "Sorry, we do not currently offer doorstep service in this area. Contact us or visit our Lalitpur showroom.";

      return NextResponse.json({
        serviceable: false,
        distanceKm: result.distanceKm,
        radiusKm: centre.radiusKm,
        message: radiusMessage,
      });
    }

    const successMessage =
      result.method === "radius" && result.distanceKm != null
        ? `Great news! You are ${result.distanceKm} km from our service centre (within our ${centre.radiusKm} km service radius). You can continue booking.`
        : `Great news! We service ${result.matchedArea}. You can continue booking.`;

    return NextResponse.json({
      serviceable: true,
      matchedArea: result.matchedArea,
      distanceKm: result.distanceKm,
      radiusKm: centre.radiusKm,
      method: result.method,
      message: successMessage,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: formatZodErrors(error) },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: "Failed to check service area" }, { status: 500 });
  }
}
