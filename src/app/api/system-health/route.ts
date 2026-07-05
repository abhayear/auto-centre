import { NextResponse } from "next/server";
import { requireAdminRole } from "@/lib/auth";
import { collectSystemHealthReport } from "@/lib/system-health-report";

export async function GET() {
  const session = await requireAdminRole();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const report = await collectSystemHealthReport();
    return NextResponse.json(report);
  } catch {
    return NextResponse.json(
      { error: "Failed to collect system health report" },
      { status: 500 },
    );
  }
}
