import { observeRoute } from "@/lib/health/observe-route";
import { NextResponse } from "next/server";
import { requireOpsPortal } from "@/lib/auth";
import { getIndianSeason } from "@/lib/indian-seasons";
import { prisma } from "@/lib/prisma";
import { buildPriceSuggestions } from "@/lib/price-suggestions";

async function getHandler() {
  const session = await requireOpsPortal();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const season = getIndianSeason();
  const vehicles = await prisma.vehicle.findMany({
    select: {
      id: true,
      make: true,
      model: true,
      year: true,
      price: true,
      status: true,
    },
  });

  return NextResponse.json({
    season,
    suggestions: buildPriceSuggestions(vehicles, season),
  });
}

export const GET = observeRoute(getHandler);
