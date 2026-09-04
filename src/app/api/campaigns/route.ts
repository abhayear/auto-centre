import { observeRoute } from "@/lib/health/observe-route";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireOpsPortal } from "@/lib/auth";
import { findLiveCampaigns } from "@/lib/campaigns";
import { prisma } from "@/lib/prisma";
import { revalidatePublicSitePages } from "@/lib/revalidate";
import { campaignPatchSchema, campaignSchema, formatZodErrors } from "@/lib/validators";

async function getHandler(request: NextRequest) {
  const session = await requireOpsPortal();
  const all = request.nextUrl.searchParams.get("all") === "true";

  if (session && all) {
    const campaigns = await prisma.siteCampaign.findMany({
      orderBy: [{ published: "desc" }, { sortOrder: "asc" }, { startsAt: "desc" }],
    });
    return NextResponse.json(campaigns);
  }

  const campaigns = await findLiveCampaigns();
  return NextResponse.json(campaigns);
}

async function postHandler(request: NextRequest) {
  const session = await requireOpsPortal();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const data = campaignSchema.parse(body);
    const campaign = await prisma.siteCampaign.create({
      data: {
        title: data.title,
        summary: data.summary,
        kind: data.kind,
        badgeLabel: data.badgeLabel?.trim() || null,
        ctaHref: data.ctaHref?.trim() || "/vehicles",
        startsAt: data.startsAt,
        endsAt: data.endsAt,
        published: data.published,
        sortOrder: data.sortOrder,
        updatedByEmail: session.user.email,
      },
    });
    revalidatePublicSitePages();
    return NextResponse.json(campaign, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: formatZodErrors(error) },
        { status: 400 },
      );
    }
    return NextResponse.json({ error: "Failed to create campaign" }, { status: 500 });
  }
}

async function patchHandler(request: NextRequest) {
  const session = await requireOpsPortal();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { id, ...rest } = body;
    if (!id || typeof id !== "string") {
      return NextResponse.json({ error: "Campaign ID required" }, { status: 400 });
    }

    const data = campaignPatchSchema.parse(rest);
    const campaign = await prisma.siteCampaign.update({
      where: { id },
      data: {
        ...data,
        badgeLabel:
          data.badgeLabel === undefined ? undefined : data.badgeLabel?.trim() || null,
        ctaHref: data.ctaHref === undefined ? undefined : data.ctaHref.trim() || "/vehicles",
        updatedByEmail: session.user.email,
      },
    });
    revalidatePublicSitePages();
    return NextResponse.json(campaign);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: formatZodErrors(error) },
        { status: 400 },
      );
    }
    return NextResponse.json({ error: "Failed to update campaign" }, { status: 500 });
  }
}

async function deleteHandler(request: NextRequest) {
  const session = await requireOpsPortal();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const id = request.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Campaign ID required" }, { status: 400 });
  }

  try {
    await prisma.siteCampaign.delete({ where: { id } });
    revalidatePublicSitePages();
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete campaign" }, { status: 500 });
  }
}

export const GET = observeRoute(getHandler);
export const POST = observeRoute(postHandler);
export const PATCH = observeRoute(patchHandler);
export const DELETE = observeRoute(deleteHandler);
