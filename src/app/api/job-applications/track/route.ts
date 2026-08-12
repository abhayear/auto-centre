import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { formatStatusLabel } from "@/lib/applicant-tracking";
import { prisma } from "@/lib/prisma";
import { applicationTrackSchema, formatZodErrors } from "@/lib/validators";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const parsed = applicationTrackSchema.parse({
      trackingCode: searchParams.get("trackingCode") ?? searchParams.get("code"),
      email: searchParams.get("email"),
    });

    const application = await prisma.jobApplication.findUnique({
      where: { trackingCode: parsed.trackingCode.toUpperCase() },
      include: {
        job: { select: { title: true, department: true, location: true } },
        activities: {
          where: { type: "status_change" },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!application || application.email.toLowerCase() !== parsed.email.toLowerCase()) {
      return NextResponse.json({ error: "Application not found. Check your code and email." }, { status: 404 });
    }

    return NextResponse.json({
      trackingCode: application.trackingCode,
      name: application.name,
      status: application.status,
      statusLabel: formatStatusLabel(application.status),
      jobTitle: application.job.title,
      department: application.job.department,
      location: application.job.location,
      appliedAt: application.createdAt,
      updatedAt: application.updatedAt,
      timeline: application.activities.map((activity) => ({
        message: activity.message,
        status: activity.status,
        statusLabel: activity.status ? formatStatusLabel(activity.status) : null,
        at: activity.createdAt,
      })),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: formatZodErrors(error) },
        { status: 400 },
      );
    }
    return NextResponse.json({ error: "Failed to look up application" }, { status: 500 });
  }
}
