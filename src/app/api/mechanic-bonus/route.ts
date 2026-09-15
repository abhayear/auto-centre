import { observeRoute } from "@/lib/health/observe-route";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { canUseOpsPortal, isStaffRole } from "@/lib/admin-roles";
import { requireOpsPortal, requireStaffSession } from "@/lib/auth";
import { bonusAverage, mechanicMembers, rosterIsReady } from "@/lib/mechanic-bonus";
import { prisma } from "@/lib/prisma";
import { formatZodErrors, mechanicBonusRosterSchema } from "@/lib/validators";

async function getRoster() {
  return (
    (await prisma.mechanicBonusRoster.findUnique({ where: { id: "default" } })) ?? {
      id: "default",
      names: [] as string[],
      photoUrls: [] as string[],
      updatedByEmail: null,
      updatedAt: null,
    }
  );
}

async function getHandler() {
  const roster = await getRoster();
  const mechanics = mechanicMembers(roster);
  const names = mechanics.map((member) => member.name);
  const session = await requireStaffSession();
  const role = session?.user?.role;
  const publicRoster = { names, mechanics };
  return NextResponse.json({
    roster: role && isStaffRole(role) && canUseOpsPortal(role) ? { ...roster, names, mechanics } : publicRoster,
    ready: rosterIsReady({ names }),
  });
}

async function putHandler(request: NextRequest) {
  const session = await requireOpsPortal();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const data = mechanicBonusRosterSchema.parse(await request.json());
    const members = mechanicMembers(data);
    const names = members.map((member) => member.name);
    const photoUrls = members.map((member) => member.photoUrl ?? "");
    const roster = await prisma.mechanicBonusRoster.upsert({
      where: { id: "default" },
      create: {
        id: "default",
        names,
        photoUrls,
        updatedByEmail: session.user.email ?? "unknown",
      },
      update: {
        names,
        photoUrls,
        updatedByEmail: session.user.email ?? "unknown",
      },
    });
    return NextResponse.json({ roster, ready: rosterIsReady(roster) });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: formatZodErrors(error) },
        { status: 400 },
      );
    }
    return NextResponse.json({ error: "Failed to save mechanic names" }, { status: 500 });
  }
}

async function ratingsHandler() {
  const session = await requireOpsPortal();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const records = await prisma.mechanicBonusRating.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  const byMechanic = new Map<string, number[]>();
  for (const row of records) {
    const scores = byMechanic.get(row.mechanicName) ?? [];
    scores.push(row.rating);
    byMechanic.set(row.mechanicName, scores);
  }
  return NextResponse.json({
    ratings: records,
    averages: [...byMechanic.entries()].map(([mechanicName, scores]) => ({
      mechanicName,
      count: scores.length,
      average: bonusAverage(scores),
    })),
  });
}

export const GET = observeRoute(async (request: NextRequest) => {
  if (request.nextUrl.searchParams.get("ratings") === "true") {
    return ratingsHandler();
  }
  return getHandler();
});
export const PUT = observeRoute(putHandler);
