import { observeRoute } from "@/lib/health/observe-route";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import {
  generateAdvisorReply,
  getDynamicSuggestedPrompts,
  type AdvisorHealthContext,
} from "@/lib/cloud-vitals-advisor";
import { collectSystemHealthReport } from "@/lib/system-health-report";
import { cloudVitalsAdviseSchema, formatZodErrors } from "@/lib/validators";

function toAdvisorContext(
  report: Awaited<ReturnType<typeof collectSystemHealthReport>>,
): AdvisorHealthContext {
  return {
    generatedAt: report.generatedAt,
    overallStatus: report.overallStatus,
    environment: report.environment,
    vitals: report.vitals,
    hourlyTraffic: report.hourlyTraffic,
    peakHour: report.peakHour,
    recommendations: report.recommendations,
  };
}

 async function getHandler() {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const report = await collectSystemHealthReport();
  return NextResponse.json({
    suggestedPrompts: getDynamicSuggestedPrompts(toAdvisorContext(report)),
  });
}

 async function postHandler(request: NextRequest) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { message, history } = cloudVitalsAdviseSchema.parse(body);
    const report = await collectSystemHealthReport();
    const context = toAdvisorContext(report);

    const result = await generateAdvisorReply(message, context, history ?? []);

    return NextResponse.json({
      reply: result.reply,
      followUps: result.followUps,
      usedAi: result.usedAi,
      overallStatus: context.overallStatus,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: formatZodErrors(error) },
        { status: 400 },
      );
    }
    return NextResponse.json({ error: "Failed to generate advice" }, { status: 500 });
  }
}

export const GET = observeRoute(getHandler);
export const POST = observeRoute(postHandler);
