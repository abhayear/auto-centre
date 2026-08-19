import { observeRoute } from "@/lib/health/observe-route";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { collectSystemHealthReport } from "@/lib/system-health-report";
import { loadHealthDashboard } from "@/lib/health/load-dashboard";

async function getHandler() {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const report = await collectSystemHealthReport();
    const monitor = await loadHealthDashboard();
    return NextResponse.json({ ...report, monitor });
  } catch {
    return NextResponse.json(
      { error: "Failed to collect system health report" },
      { status: 500 },
    );
  }
}

export const GET = observeRoute(getHandler);
