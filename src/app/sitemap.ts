import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";
import { getSiteUrl } from "@/lib/site-url";

const STATIC_PATHS = [
  { path: "", changeFrequency: "weekly" as const, priority: 1 },
  { path: "/vehicles", changeFrequency: "daily" as const, priority: 0.9 },
  { path: "/services", changeFrequency: "weekly" as const, priority: 0.8 },
  { path: "/book-service", changeFrequency: "monthly" as const, priority: 0.8 },
  { path: "/test-drive", changeFrequency: "monthly" as const, priority: 0.8 },
  { path: "/service-schedule", changeFrequency: "monthly" as const, priority: 0.7 },
  { path: "/about", changeFrequency: "monthly" as const, priority: 0.7 },
  { path: "/contact", changeFrequency: "monthly" as const, priority: 0.7 },
  { path: "/careers", changeFrequency: "weekly" as const, priority: 0.7 },
  { path: "/investment", changeFrequency: "monthly" as const, priority: 0.6 },
  { path: "/sitemap", changeFrequency: "monthly" as const, priority: 0.3 },
];

function getStaticRoutes(): MetadataRoute.Sitemap {
  const base = getSiteUrl();
  return STATIC_PATHS.map(({ path, changeFrequency, priority }) => ({
    url: `${base}${path}`,
    changeFrequency,
    priority,
  }));
}

async function getDynamicRoutes(): Promise<MetadataRoute.Sitemap> {
  try {
    const [vehicles, jobs] = await Promise.all([
      prisma.vehicle.findMany({
        where: { status: "available" },
        select: { id: true, updatedAt: true },
      }),
      prisma.jobPosting.findMany({
        where: { active: true, status: "open" },
        select: { id: true, updatedAt: true },
      }),
    ]);

    return [
      ...vehicles.map((vehicle) => ({
        url: `${getSiteUrl()}/vehicles/${vehicle.id}`,
        lastModified: vehicle.updatedAt,
        changeFrequency: "weekly" as const,
        priority: 0.8,
      })),
      ...jobs.map((job) => ({
        url: `${getSiteUrl()}/careers/${job.id}`,
        lastModified: job.updatedAt,
        changeFrequency: "weekly" as const,
        priority: 0.6,
      })),
    ];
  } catch {
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const dynamicRoutes = await getDynamicRoutes();
  return [...getStaticRoutes(), ...dynamicRoutes];
}
