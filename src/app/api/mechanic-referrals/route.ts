import { observeRoute } from "@/lib/health/observe-route";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireOpsPortal } from "@/lib/auth";
import { formatMechanicExpertise } from "@/lib/mechanic-referral";
import { prisma } from "@/lib/prisma";
import { formatZodErrors, mechanicReferralSchema } from "@/lib/validators";

async function getHandler() {
  const session = await requireOpsPortal();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const records = await prisma.mechanicReferral.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  return NextResponse.json(
    records.map((row) => ({
      ...row,
      expertiseLabel: formatMechanicExpertise(row.expertise),
    })),
  );
}

async function postHandler(request: NextRequest) {
  try {
    const data = mechanicReferralSchema.parse(await request.json());
    const record = await prisma.mechanicReferral.create({
      data: {
        name: data.name,
        contactNo: data.contactNo,
        address: data.address,
        yearsOfExpertise: data.yearsOfExpertise,
        expertise: data.expertise,
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
    return NextResponse.json({ error: "Failed to save mechanic referral" }, { status: 500 });
  }
}

export const GET = observeRoute(getHandler);
export const POST = observeRoute(postHandler);
