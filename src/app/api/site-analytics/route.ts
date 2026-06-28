import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import {
  getRecentSiteVisits,
  getSiteAnalyticsSummary,
  normalizeVisitPath,
  parseGeoFromHeaders,
  recordSiteVisit,
} from "@/lib/site-analytics";
import { recordHomePageVisit } from "@/lib/visitor-count";
import { formatZodErrors } from "@/lib/validators";

const recordVisitSchema = z.object({
  path: z.string().min(1).max(200),
});

export async function GET() {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [summary, visits] = await Promise.all([
    getSiteAnalyticsSummary(),
    getRecentSiteVisits(100),
  ]);

  return NextResponse.json({ summary, visits });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { path } = recordVisitSchema.parse(body);
    const normalizedPath = normalizeVisitPath(path);
    const geo = parseGeoFromHeaders(request.headers);

    await recordSiteVisit({
      path: normalizedPath,
      ...geo,
      userAgent: request.headers.get("user-agent"),
      referer: request.headers.get("referer"),
    });

    if (normalizedPath === "/") {
      const countData = await recordHomePageVisit();
      return NextResponse.json({ recorded: true, ...countData });
    }

    return NextResponse.json({ recorded: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: formatZodErrors(error) },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: "Failed to record visit" }, { status: 500 });
  }
}
