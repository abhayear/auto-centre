import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";
import { getSiteUrl } from "@/lib/site-url";

const STATIC_ROUTES: MetadataRoute.Sitemap = [
  { url: "", changeFrequency: "weekly", priority: 1 },
  { url: "/vehicles", changeFrequency: "daily", priority: 0.9 },
  { url: "/services", changeFrequency: "weekly", priority: 0.8 },
  { url: "/book-service", changeFrequency: "monthly", priority: 0.8 },
  { url: "/test-drive", changeFrequency: "monthly", priority: 0.8 },
  { url: "/service-schedule", changeFrequency: "monthly", priority: 0.7 },
  { url: "/about", changeFrequency: "monthly", priority: 0.7 },
  { url: "/contact", changeFrequency: "monthly", priority: 0.7 },
  { url: "/careers", changeFrequency: "weekly", priority: 0.7 },
  { url: "/investment", changeFrequency: "monthly", priority: 0.6 },
  { url: "/sitemap", changeFrequency: "monthly", priority: 0.3 },
].map(({ url, changeFrequency, priority }) => ({
  url: `${getSiteUrl()}${url}`,
  changeFrequency,
  priority,
}));

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
  return [...STATIC_ROUTES, ...dynamicRoutes];
}
