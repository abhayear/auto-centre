import { beforeEach, describe, expect, it, vi } from "vitest";

const { collectSystemHealthReport, loadHealthDashboard, requireAdmin } = vi.hoisted(() => ({
  collectSystemHealthReport: vi.fn(),
  loadHealthDashboard: vi.fn(),
  requireAdmin: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ requireAdmin }));
vi.mock("@/lib/system-health-report", () => ({ collectSystemHealthReport }));
vi.mock("@/lib/health/load-dashboard", () => ({ loadHealthDashboard }));
vi.mock("@/lib/health/observe-route", () => ({
  observeRoute: <T>(handler: T) => handler,
}));

import { GET } from "@/app/api/system-health/route";

describe("/api/system-health", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireAdmin.mockResolvedValue({ user: { role: "admin" } });
    collectSystemHealthReport.mockResolvedValue({
      generatedAt: "2026-08-19T05:00:00.000Z",
      overallStatus: "ok",
    });
    loadHealthDashboard.mockResolvedValue({
      signals: [],
      openAlerts: [],
      recentSnapshots: [],
    });
  });

  it("adds monitoring data to the system health report", async () => {
    const response = await GET(
      new Request("https://example.com/api/system-health"),
      undefined,
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      generatedAt: "2026-08-19T05:00:00.000Z",
      overallStatus: "ok",
      monitor: {
        signals: [],
        openAlerts: [],
        recentSnapshots: [],
      },
    });
    expect(loadHealthDashboard).toHaveBeenCalledOnce();
  });
});
