import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePublicSitePages } from "@/lib/revalidate";
import { getServiceSchedule } from "@/lib/service-schedule";
import {
  DEFAULT_SERVICE_SCHEDULE_CONTENT,
  DEFAULT_SERVICE_SCHEDULE_SUMMARY,
  DEFAULT_SERVICE_SCHEDULE_TITLE,
} from "@/lib/service-schedule-default";
import { formatZodErrors, serviceScheduleSchema } from "@/lib/validators";

export async function GET(request: NextRequest) {
  const schedule = await getServiceSchedule();
  const session = await requireAdmin();
  const publicOnly = request.nextUrl.searchParams.get("public") === "true";

  if (publicOnly && !schedule.published) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (!session && !schedule.published) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(schedule, {
    headers: { "Cache-Control": "no-store, max-age=0" },
  });
}

export async function PATCH(request: NextRequest) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const data = serviceScheduleSchema.parse(body);

    const row = await prisma.serviceScheduleContent.upsert({
      where: { id: "default" },
      update: {
        title: data.title.trim(),
        summary: data.summary?.trim() || null,
        content: data.content.trim(),
        published: data.published,
      },
      create: {
        id: "default",
        title: data.title.trim(),
        summary: data.summary?.trim() || null,
        content: data.content.trim(),
        published: data.published,
      },
    });

    revalidatePublicSitePages();

    return NextResponse.json({
      title: row.title,
      summary: row.summary,
      content: row.content,
      published: row.published,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: formatZodErrors(error) },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: "Failed to update service schedule" }, { status: 500 });
  }
}

export async function PUT() {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const row = await prisma.serviceScheduleContent.upsert({
    where: { id: "default" },
    update: {
      title: DEFAULT_SERVICE_SCHEDULE_TITLE,
      summary: DEFAULT_SERVICE_SCHEDULE_SUMMARY,
      content: DEFAULT_SERVICE_SCHEDULE_CONTENT,
    },
    create: {
      id: "default",
      title: DEFAULT_SERVICE_SCHEDULE_TITLE,
      summary: DEFAULT_SERVICE_SCHEDULE_SUMMARY,
      content: DEFAULT_SERVICE_SCHEDULE_CONTENT,
      published: true,
    },
  });

  revalidatePublicSitePages();

  return NextResponse.json({
    title: row.title,
    summary: row.summary,
    content: row.content,
    published: row.published,
  });
}
