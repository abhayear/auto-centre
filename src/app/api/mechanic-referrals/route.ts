import { observeRoute } from "@/lib/health/observe-route";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireOpsPortal } from "@/lib/auth";
import {
  formatMechanicExpertise,
  referralRewardLabel,
  referralRewardState,
} from "@/lib/mechanic-referral";
import { prisma } from "@/lib/prisma";
import {
  formatZodErrors,
  mechanicReferralActionSchema,
  mechanicReferralSchema,
} from "@/lib/validators";

function serializeReferral(row: {
  id: string;
  name: string;
  contactNo: string;
  address: string;
  yearsOfExpertise: number;
  expertise: string[];
  referrerName: string;
  referrerContact: string;
  hiredAt: Date | null;
  rewardedAt: Date | null;
  createdAt: Date;
}) {
  const rewardState = referralRewardState(row);
  return {
    ...row,
    expertiseLabel: formatMechanicExpertise(row.expertise),
    rewardState,
    rewardLabel: referralRewardLabel(rewardState),
  };
}

async function getHandler() {
  const session = await requireOpsPortal();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const records = await prisma.mechanicReferral.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  return NextResponse.json(records.map(serializeReferral));
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
        referrerName: data.referrerName,
        referrerContact: data.referrerContact,
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

async function patchHandler(request: NextRequest) {
  const session = await requireOpsPortal();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id, action } = mechanicReferralActionSchema.parse(await request.json());
    const existing = await prisma.mechanicReferral.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Referral not found" }, { status: 404 });
    }

    if (action === "hire") {
      if (existing.hiredAt) {
        return NextResponse.json(serializeReferral(existing));
      }
      const record = await prisma.mechanicReferral.update({
        where: { id },
        data: { hiredAt: new Date() },
      });
      return NextResponse.json(serializeReferral(record));
    }

    if (referralRewardState(existing) !== "due") {
      return NextResponse.json(
        { error: "₹500 labour off is due only after the mechanic is hired and stays 15 days." },
        { status: 409 },
      );
    }
    const record = await prisma.mechanicReferral.update({
      where: { id },
      data: { rewardedAt: new Date() },
    });
    return NextResponse.json(serializeReferral(record));
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: formatZodErrors(error) },
        { status: 400 },
      );
    }
    return NextResponse.json({ error: "Failed to update referral" }, { status: 500 });
  }
}

export const GET = observeRoute(getHandler);
export const POST = observeRoute(postHandler);
export const PATCH = observeRoute(patchHandler);
