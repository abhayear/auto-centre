import { describe, expect, it, vi } from "vitest";
import { loadHealthDashboard } from "@/lib/health/load-dashboard";

describe("loadHealthDashboard", () => {
  it("loads current signals, open alerts, and the latest 24 snapshots", async () => {
    const signals = [
      {
        id: "availability",
        label: "Site availability",
        value: "offline",
        threshold: "2 consecutive failures",
        status: "critical",
        suggestedAction: "Check the deployment logs.",
      },
    ];
    const openAlerts = [
      {
        id: "alert-1",
        signal: "availability",
        severity: "critical",
        openedAt: new Date("2026-08-19T04:00:00.000Z"),
        lastSeenAt: new Date("2026-08-19T05:00:00.000Z"),
        title: "Site availability",
        detail: "offline",
        suggestedAction: "Check the deployment logs.",
      },
    ];
    const recentSnapshots = [
      {
        createdAt: new Date("2026-08-19T05:00:00.000Z"),
        overallStatus: "critical",
      },
    ];
    const healthSnapshot = {
      findFirst: vi.fn().mockResolvedValue({ payload: { signals } }),
      findMany: vi.fn().mockResolvedValue(recentSnapshots),
    };
    const healthAlert = {
      findMany: vi.fn().mockResolvedValue(openAlerts),
    };

    await expect(loadHealthDashboard({ healthSnapshot, healthAlert })).resolves.toEqual({
      signals,
      openAlerts,
      recentSnapshots,
    });
    expect(healthSnapshot.findFirst).toHaveBeenCalledWith({
      orderBy: { createdAt: "desc" },
      select: { payload: true },
    });
    expect(healthAlert.findMany).toHaveBeenCalledWith({
      where: { state: "open" },
      orderBy: { openedAt: "desc" },
      select: {
        id: true,
        signal: true,
        severity: true,
        openedAt: true,
        lastSeenAt: true,
        title: true,
        detail: true,
        suggestedAction: true,
      },
    });
    expect(healthSnapshot.findMany).toHaveBeenCalledWith({
      orderBy: { createdAt: "desc" },
      take: 24,
      select: { createdAt: true, overallStatus: true },
    });
  });

  it("uses no signals when the latest snapshot payload has none", async () => {
    const healthSnapshot = {
      findFirst: vi.fn().mockResolvedValue({ payload: { facts: {} } }),
      findMany: vi.fn().mockResolvedValue([]),
    };
    const healthAlert = {
      findMany: vi.fn().mockResolvedValue([]),
    };

    const dashboard = await loadHealthDashboard({ healthSnapshot, healthAlert });

    expect(dashboard.signals).toEqual([]);
  });
});
