import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  APPLICATION_STATUS_LABELS,
  generateTrackingCode,
} from "@/lib/applicant-tracking";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  formatZodErrors,
  jobApplicationSchema,
  jobApplicationStatusSchema,
} from "@/lib/validators";
import { notifyJobApplication } from "@/lib/whatsapp-notify";

async function createUniqueTrackingCode(): Promise<string> {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const trackingCode = generateTrackingCode();
    const existing = await prisma.jobApplication.findUnique({
      where: { trackingCode },
      select: { id: true },
    });
    if (!existing) return trackingCode;
  }
  throw new Error("Failed to generate tracking code");
}

export async function GET(request: NextRequest) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const status = searchParams.get("status");
  const jobId = searchParams.get("jobId");
  const q = searchParams.get("q")?.trim();

  try {
    const applications = await prisma.jobApplication.findMany({
      where: {
        ...(status ? { status } : {}),
        ...(jobId ? { jobId } : {}),
        ...(q
          ? {
              OR: [
                { name: { contains: q, mode: "insensitive" } },
                { email: { contains: q, mode: "insensitive" } },
                { trackingCode: { contains: q.toUpperCase(), mode: "insensitive" } },
              ],
            }
          : {}),
      },
      include: { job: true },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(applications);
  } catch (error) {
    console.error("Failed to fetch job applications:", error);
    return NextResponse.json(
      { error: "Failed to fetch applications. Run database migrations." },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const data = jobApplicationSchema.parse(body);

    const job = await prisma.jobPosting.findUnique({ where: { id: data.jobId } });
    if (!job || !job.active || job.status !== "open") {
      return NextResponse.json({ error: "This position is no longer available" }, { status: 400 });
    }

    const trackingCode = await createUniqueTrackingCode();

    const application = await prisma.jobApplication.create({
      data: {
        jobId: data.jobId,
        name: data.name,
        email: data.email,
        phone: data.phone ?? null,
        resumeUrl: data.resumeUrl || null,
        coverLetter: data.coverLetter ?? null,
        trackingCode,
        activities: {
          create: {
            type: "status_change",
            message: APPLICATION_STATUS_LABELS.new,
            status: "new",
          },
        },
      },
      include: { job: true },
    });

    notifyJobApplication(application).catch((error) => {
      console.error("WhatsApp job application notification failed:", error);
    });

    return NextResponse.json(application, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: formatZodErrors(error) },
        { status: 400 },
      );
    }
    return NextResponse.json({ error: "Failed to submit application" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { id, ...rest } = body;

    if (!id) {
      return NextResponse.json({ error: "Application ID required" }, { status: 400 });
    }

    const { status } = jobApplicationStatusSchema.parse(rest);

    const application = await prisma.jobApplication.update({
      where: { id },
      data: { status },
      include: { job: true },
    });

    return NextResponse.json(application);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: formatZodErrors(error) },
        { status: 400 },
      );
    }
    return NextResponse.json({ error: "Failed to update application" }, { status: 500 });
  }
}
