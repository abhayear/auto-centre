import { prisma } from "@/lib/prisma";

export function liveCampaignWhere(now: Date = new Date()) {
  return {
    published: true,
    startsAt: { lte: now },
    endsAt: { gte: now },
  };
}

export async function findLiveCampaigns(now: Date = new Date()) {
  return prisma.siteCampaign.findMany({
    where: liveCampaignWhere(now),
    orderBy: [{ sortOrder: "asc" }, { startsAt: "desc" }],
  });
}
