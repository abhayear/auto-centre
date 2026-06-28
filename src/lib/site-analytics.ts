import { prisma } from "@/lib/prisma";

export type VisitGeo = {
  city: string | null;
  region: string | null;
  country: string | null;
};

export type RecordVisitInput = {
  path: string;
  city?: string | null;
  region?: string | null;
  country?: string | null;
  userAgent?: string | null;
  referer?: string | null;
};

export function parseGeoFromHeaders(headers: Headers): VisitGeo {
  const city = headers.get("x-vercel-ip-city")?.trim() || null;
  const region = headers.get("x-vercel-ip-country-region")?.trim() || null;
  const country = headers.get("x-vercel-ip-country")?.trim() || null;

  if (city || region || country) {
    return { city, region, country };
  }

  return { city: null, region: null, country: null };
}

export function parseDeviceFromUserAgent(userAgent: string | null): string {
  if (!userAgent) return "Unknown";
  const ua = userAgent.toLowerCase();
  if (ua.includes("mobile") || ua.includes("android") || ua.includes("iphone")) {
    return "Mobile";
  }
  if (ua.includes("tablet") || ua.includes("ipad")) {
    return "Tablet";
  }
  return "Desktop";
}

export function normalizeVisitPath(path: string): string {
  const trimmed = path.trim();
  if (!trimmed.startsWith("/") || trimmed.length > 200) {
    return "/";
  }
  return trimmed.split("?")[0] || "/";
}

export async function recordSiteVisit(input: RecordVisitInput) {
  const path = normalizeVisitPath(input.path);

  return prisma.siteVisit.create({
    data: {
      path,
      city: input.city?.trim() || null,
      region: input.region?.trim() || null,
      country: input.country?.trim() || null,
      device: parseDeviceFromUserAgent(input.userAgent ?? null),
      referer: input.referer?.trim()?.slice(0, 500) || null,
    },
  });
}

export async function getSiteAnalyticsSummary() {
  const now = new Date();
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);

  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - 7);

  const [total, today, week, topPages, topCities] = await Promise.all([
    prisma.siteVisit.count(),
    prisma.siteVisit.count({ where: { visitedAt: { gte: startOfToday } } }),
    prisma.siteVisit.count({ where: { visitedAt: { gte: startOfWeek } } }),
    prisma.siteVisit.groupBy({
      by: ["path"],
      _count: { path: true },
      orderBy: { _count: { path: "desc" } },
      take: 5,
    }),
    prisma.siteVisit.groupBy({
      by: ["city"],
      where: { city: { not: null } },
      _count: { city: true },
      orderBy: { _count: { city: "desc" } },
      take: 5,
    }),
  ]);

  return {
    total,
    today,
    week,
    topPages: topPages.map((row) => ({ path: row.path, count: row._count.path })),
    topCities: topCities
      .filter((row) => row.city)
      .map((row) => ({ city: row.city as string, count: row._count.city })),
  };
}

export async function getRecentSiteVisits(limit = 50) {
  return prisma.siteVisit.findMany({
    orderBy: { visitedAt: "desc" },
    take: limit,
  });
}

export function formatVisitLocation(visit: {
  city: string | null;
  region: string | null;
  country: string | null;
}): string {
  const parts = [visit.city, visit.region, visit.country].filter(Boolean);
  return parts.length > 0 ? parts.join(", ") : "Unknown location";
}
