import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePublicSitePages } from "@/lib/revalidate";
import {
  getSiteSettings,
  parseBusinessHours,
  serializeBusinessHours,
} from "@/lib/site-settings";
import { formatZodErrors, siteSettingsSchema } from "@/lib/validators";

export async function GET() {
  const settings = await getSiteSettings();
  return NextResponse.json(settings, {
    headers: {
      "Cache-Control": "no-store, max-age=0",
    },
  });
}

export async function PATCH(request: NextRequest) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const data = siteSettingsSchema.parse(body);

    const row = await prisma.siteSettings.upsert({
      where: { id: "default" },
      update: {
        businessHours: serializeBusinessHours(data.businessHours),
        noticeText: data.noticeText?.trim() || null,
        noticeActive: data.noticeActive,
        visitorCount: data.visitorCount,
        showVisitorCount: data.showVisitorCount,
      },
      create: {
        id: "default",
        businessHours: serializeBusinessHours(data.businessHours),
        noticeText: data.noticeText?.trim() || null,
        noticeActive: data.noticeActive,
        visitorCount: data.visitorCount,
        showVisitorCount: data.showVisitorCount,
      },
    });

    revalidatePublicSitePages();

    return NextResponse.json({
      businessHours: parseBusinessHours(row.businessHours),
      noticeText: row.noticeText,
      noticeActive: row.noticeActive,
      visitorCount: row.visitorCount,
      showVisitorCount: row.showVisitorCount,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: formatZodErrors(error) },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: "Failed to update site settings" }, { status: 500 });
  }
}
