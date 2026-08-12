import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { statusChangeMessage } from "@/lib/applicant-tracking";
import { parseEvaluationScores } from "@/lib/job-role-evaluation";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatZodErrors, jobApplicationUpdateSchema } from "@/lib/validators";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, context: RouteContext) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;

  try {
    const application = await prisma.jobApplication.findUnique({
      where: { id },
      include: {
        job: true,
        activities: { orderBy: { createdAt: "desc" } },
      },
    });

    if (!application) {
      return NextResponse.json({ error: "Application not found" }, { status: 404 });
    }

    return NextResponse.json(application);
  } catch (error) {
    console.error("Failed to fetch application:", error);
    return NextResponse.json({ error: "Failed to fetch application" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;

  try {
    const body = await request.json();
    const data = jobApplicationUpdateSchema.parse(body);

    const existing = await prisma.jobApplication.findUnique({
      where: { id },
      include: { job: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "Application not found" }, { status: 404 });
    }

    const activities: {
      type: string;
      message: string;
      status?: string;
      createdBy?: string;
    }[] = [];

    if (data.status && data.status !== existing.status) {
      activities.push({
        type: "status_change",
        message: statusChangeMessage(existing.status, data.status),
        status: data.status,
        createdBy: session.user?.email ?? undefined,
      });
    }

    if (data.note) {
      activities.push({
        type: "note",
        message: data.note,
        createdBy: session.user?.email ?? undefined,
      });
    }

    const evaluationScores =
      data.evaluationScores !== undefined
        ? parseEvaluationScores(existing.job.roleTemplate, data.evaluationScores)
        : undefined;

    if (data.evaluationScores !== undefined && data.evaluationScores && !evaluationScores) {
      return NextResponse.json({ error: "Invalid evaluation scores" }, { status: 400 });
    }

    const application = await prisma.jobApplication.update({
      where: { id },
      data: {
        ...(data.status ? { status: data.status } : {}),
        ...(data.adminNotes !== undefined ? { adminNotes: data.adminNotes } : {}),
        ...(evaluationScores !== undefined
          ? { evaluationScores: evaluationScores ?? undefined }
          : {}),
        ...(activities.length
          ? {
              activities: {
                create: activities,
              },
            }
          : {}),
      },
      include: {
        job: true,
        activities: { orderBy: { createdAt: "desc" } },
      },
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
