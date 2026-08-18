import { prisma } from "@/lib/prisma";
import {
  routeGroupFromPath,
  statusClassFromStatus,
  truncateToMinute,
} from "@/lib/health/route-group";

export async function recordMinuteBucket(input: {
  path: string;
  status: number;
  durationMs: number;
}): Promise<void> {
  try {
    const { path, status, durationMs } = input;

    if (path.startsWith("/api/ops")) {
      return;
    }

    const routeGroup = routeGroupFromPath(path);
    if (routeGroup === "") {
      return;
    }

    const minute = truncateToMinute(new Date());
    const statusClass = statusClassFromStatus(status);

    await prisma.healthMinuteBucket.upsert({
      where: {
        minute_routeGroup_statusClass: {
          minute,
          routeGroup,
          statusClass,
        },
      },
      create: {
        minute,
        routeGroup,
        statusClass,
        count: 1,
        totalDurationMs: durationMs,
      },
      update: {
        count: { increment: 1 },
        totalDurationMs: { increment: durationMs },
      },
    });
  } catch {
    // Never throw to the request path.
  }
}
