import { BUSINESS_HOURS } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { serializeBusinessHours } from "@/lib/site-settings";
import type { VisitorCountData } from "@/lib/visitor-count-types";

export type { VisitorCountData } from "@/lib/visitor-count-types";
export { formatVisitorCount } from "@/lib/visitor-count-format";

const defaultBusinessHours = serializeBusinessHours(BUSINESS_HOURS);

export async function getVisitorCount(): Promise<VisitorCountData> {
  const row = await prisma.siteSettings.findUnique({ where: { id: "default" } });

  if (!row) {
    return { visitorCount: 0, showVisitorCount: true };
  }

  return {
    visitorCount: row.visitorCount,
    showVisitorCount: row.showVisitorCount,
  };
}

export async function recordHomePageVisit(): Promise<VisitorCountData> {
  const existing = await prisma.siteSettings.findUnique({ where: { id: "default" } });

  if (!existing) {
    const created = await prisma.siteSettings.create({
      data: {
        id: "default",
        businessHours: defaultBusinessHours,
        visitorCount: 1,
        showVisitorCount: true,
      },
    });
    return {
      visitorCount: created.visitorCount,
      showVisitorCount: created.showVisitorCount,
    };
  }

  const updated = await prisma.siteSettings.update({
    where: { id: "default" },
    data: { visitorCount: { increment: 1 } },
  });

  return {
    visitorCount: updated.visitorCount,
    showVisitorCount: updated.showVisitorCount,
  };
}
