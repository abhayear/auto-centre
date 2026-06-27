import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  formatZodErrors,
  jobApplicationSchema,
  jobApplicationStatusSchema,
} from "@/lib/validators";

export async function GET(request: NextRequest) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const status = searchParams.get("status");
  const jobId = searchParams.get("jobId");

  try {
    const applications = await prisma.jobApplication.findMany({
      where: {
        ...(status ? { status } : {}),
        ...(jobId ? { jobId } : {}),
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

    const application = await prisma.jobApplication.create({
      data: {
        jobId: data.jobId,
        name: data.name,
        email: data.email,
        phone: data.phone ?? null,
        resumeUrl: data.resumeUrl || null,
        coverLetter: data.coverLetter ?? null,
      },
      include: { job: true },
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
