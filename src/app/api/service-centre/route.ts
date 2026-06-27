import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { STORE_LOCATION } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { formatZodErrors } from "@/lib/validators";

const serviceCentreSchema = z.object({
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
  radiusKm: z.coerce.number().positive("Radius must be greater than 0"),
  radiusCheckEnabled: z.boolean(),
  label: z.string().min(2, "Label is required"),
});

const defaultConfig = {
  id: "default",
  latitude: STORE_LOCATION.lat,
  longitude: STORE_LOCATION.lng,
  radiusKm: 25,
  radiusCheckEnabled: true,
  label: "Auto Galaxy Service Centre",
};

export async function GET() {
  const config = await prisma.serviceCentreConfig.findUnique({
    where: { id: "default" },
  });

  return NextResponse.json(config ?? defaultConfig);
}

export async function PATCH(request: NextRequest) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const data = serviceCentreSchema.parse(body);

    const config = await prisma.serviceCentreConfig.upsert({
      where: { id: "default" },
      update: data,
      create: { id: "default", ...data },
    });

    return NextResponse.json(config);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: formatZodErrors(error) },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: "Failed to update service centre" }, { status: 500 });
  }
}
