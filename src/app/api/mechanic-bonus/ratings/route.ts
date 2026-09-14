import { observeRoute } from "@/lib/health/observe-route";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { rosterIsReady } from "@/lib/mechanic-bonus";
import { prisma } from "@/lib/prisma";
import { formatZodErrors, mechanicBonusRatingSchema } from "@/lib/validators";

async function postHandler(request: NextRequest) {
  try {
    const data = mechanicBonusRatingSchema.parse(await request.json());
    const roster = await prisma.mechanicBonusRoster.findUnique({ where: { id: "default" } });
    if (!roster || !rosterIsReady(roster)) {
      return NextResponse.json(
        { error: "Manager has not named the three mechanics yet." },
        { status: 409 },
      );
    }

    const record = await prisma.mechanicBonusRating.create({
      data: {
        billNo: data.billNo,
        mechanic1Name: roster.mechanic1Name,
        mechanic1Rating: data.mechanic1Rating,
        mechanic2Name: roster.mechanic2Name,
        mechanic2Rating: data.mechanic2Rating,
        mechanic3Name: roster.mechanic3Name,
        mechanic3Rating: data.mechanic3Rating,
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
