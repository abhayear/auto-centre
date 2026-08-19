import { observeRoute } from "@/lib/health/observe-route";
import { NextResponse } from "next/server";
import { APPLICATION_STATUSES } from "@/lib/applicant-tracking";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

 async function getHandler() {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const [counts, recent, byJob] = await Promise.all([
      prisma.jobApplication.groupBy({
        by: ["status"],
        _count: { _all: true },
      }),
      prisma.jobApplication.count({
        where: {
          createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        },
      }),
      prisma.jobApplication.groupBy({
        by: ["jobId"],
        _count: { _all: true },
      }),
    ]);

    const jobs = await prisma.jobPosting.findMany({
      where: { id: { in: byJob.map((row) => row.jobId) } },
      select: { id: true, title: true },
    });

    const jobTitleById = Object.fromEntries(jobs.map((job) => [job.id, job.title]));

    const pipeline = APPLICATION_STATUSES.map((status) => ({
      status,
      count: counts.find((row) => row.status === status)?._count._all ?? 0,
    }));

    return NextResponse.json({
      total: pipeline.reduce((sum, row) => sum + row.count, 0),
      newThisWeek: recent,
      pipeline,
      byJob: byJob.map((row) => ({
        jobId: row.jobId,
        jobTitle: jobTitleById[row.jobId] ?? "Unknown role",
        count: row._count._all,
      })),
    });
  } catch (error) {
    console.error("Failed to fetch applicant stats:", error);
    return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 });
  }
}

export const GET = observeRoute(getHandler);
