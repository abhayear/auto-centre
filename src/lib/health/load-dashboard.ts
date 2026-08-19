import { prisma } from "@/lib/prisma";
import type { MonitorSignal } from "@/lib/health/signals";

type DashboardDatabase = {
  healthSnapshot: {
    findFirst(args: unknown): Promise<unknown>;
    findMany(args: unknown): Promise<unknown>;
  };
  healthAlert: {
    findMany(args: unknown): Promise<unknown>;
  };
};

type SnapshotPayload = {
  signals?: unknown;
};

export async function loadHealthDashboard(
  database: DashboardDatabase = prisma as unknown as DashboardDatabase,
) {
  const [latestSnapshot, openAlerts, recentSnapshots] = await Promise.all([
    database.healthSnapshot.findFirst({
      orderBy: { createdAt: "desc" },
      select: { payload: true },
    }),
    database.healthAlert.findMany({
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
    }),
    database.healthSnapshot.findMany({
      orderBy: { createdAt: "desc" },
      take: 24,
      select: { createdAt: true, overallStatus: true },
    }),
  ]);

  const payload =
    latestSnapshot && typeof latestSnapshot === "object" && "payload" in latestSnapshot
      ? (latestSnapshot.payload as SnapshotPayload)
      : null;

  return {
    signals: (Array.isArray(payload?.signals) ? payload.signals : []) as MonitorSignal[],
    openAlerts,
    recentSnapshots,
  };
}
