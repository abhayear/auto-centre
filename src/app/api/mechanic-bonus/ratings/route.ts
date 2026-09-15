import { observeRoute } from "@/lib/health/observe-route";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { isRosterMechanic, rosterIsReady } from "@/lib/mechanic-bonus";
import { prisma } from "@/lib/prisma";
import { formatZodErrors, mechanicBonusRatingSchema } from "@/lib/validators";

async function postHandler(request: NextRequest) {
  try {
    const data = mechanicBonusRatingSchema.parse(await request.json());
    const roster = await prisma.mechanicBonusRoster.findUnique({ where: { id: "default" } });
    if (!roster || !rosterIsReady(roster)) {
      return NextResponse.json(
        { error: "Manager has not named the mechanics yet." },
        { status: 409 },
      );
    }
    if (!isRosterMechanic(roster, data.mechanicName)) {
      return NextResponse.json(
        { error: "Choose one mechanic from the list." },
        { status: 400 },
      );
    }

    const record = await prisma.mechanicBonusRating.create({
      data: {
        billNo: data.billNo,
        mechanicName: data.mechanicName,
        rating: data.rating,
      },
    });

    return NextResponse.json({ id: record.id }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: formatZodErrors(error) },
        { status: 400 },
      );
    }
    return NextResponse.json({ error: "Failed to save rating" }, { status: 500 });
  }
}

export const POST = observeRoute(postHandler);
