import { observeRoute } from "@/lib/health/observe-route";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { canUseOpsPortal, isStaffRole } from "@/lib/admin-roles";
import { requireOpsPortal, requireStaffSession } from "@/lib/auth";
import { bonusAverage } from "@/lib/mechanic-bonus";
import { prisma } from "@/lib/prisma";
import { formatZodErrors, mechanicBonusRosterSchema } from "@/lib/validators";

async function getRoster() {
  return (
    (await prisma.mechanicBonusRoster.findUnique({ where: { id: "default" } })) ?? {
      id: "default",
      mechanic1Name: "",
      mechanic2Name: "",
      mechanic3Name: "",
      updatedByEmail: null,
      updatedAt: null,
    }
  );
}

async function getHandler() {
  const roster = await getRoster();
  const session = await requireStaffSession();
  const role = session?.user?.role;
  const publicRoster = {
    mechanic1Name: roster.mechanic1Name,
    mechanic2Name: roster.mechanic2Name,
    mechanic3Name: roster.mechanic3Name,
  };
  return NextResponse.json({
    roster: role && isStaffRole(role) && canUseOpsPortal(role) ? roster : publicRoster,
    ready: Boolean(roster.mechanic1Name && roster.mechanic2Name && roster.mechanic3Name),
  });
}

async function putHandler(request: NextRequest) {
  const session = await requireOpsPortal();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const data = mechanicBonusRosterSchema.parse(await request.json());
    const roster = await prisma.mechanicBonusRoster.upsert({
      where: { id: "default" },
      create: {
        id: "default",
        ...data,
        updatedByEmail: session.user.email ?? "unknown",
      },
      update: {
        ...data,
        updatedByEmail: session.user.email ?? "unknown",
      },
    });
    return NextResponse.json({ roster, ready: true });
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
  return NextResponse.json(
    records.map((row) => ({
      ...row,
      bonusAverage: bonusAverage([row.mechanic1Rating, row.mechanic2Rating, row.mechanic3Rating]),
    })),
  );
}

export const GET = observeRoute(async (request: NextRequest) => {
  if (request.nextUrl.searchParams.get("ratings") === "true") {
    return ratingsHandler();
  }
  return getHandler();
});
export const PUT = observeRoute(putHandler);
