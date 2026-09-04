import { observeRoute } from "@/lib/health/observe-route";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireOpsPortal } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePublicVehiclePages } from "@/lib/revalidate";
import { applyPriceUpdatesSchema, formatZodErrors } from "@/lib/validators";

async function postHandler(request: NextRequest) {
  const session = await requireOpsPortal();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { updates } = applyPriceUpdatesSchema.parse(body);

    const results = await prisma.$transaction(
      updates.map((update) =>
        prisma.vehicle.update({
          where: { id: update.id },
          data: { price: update.price },
          select: { id: true, price: true },
        }),
      ),
    );

    revalidatePublicVehiclePages();
    return NextResponse.json({ updated: results.length, vehicles: results });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: formatZodErrors(error) },
        { status: 400 },
      );
    }
    return NextResponse.json({ error: "Failed to apply prices" }, { status: 500 });
  }
}

export const POST = observeRoute(postHandler);
