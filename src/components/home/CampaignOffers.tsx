import Link from "next/link";
import type { SiteCampaign } from "@prisma/client";

export function CampaignOffers({ campaigns }: { campaigns: SiteCampaign[] }) {
  if (campaigns.length === 0) return null;

  return (
    <section className="border-b border-red-900/40 bg-gradient-to-r from-red-950/80 to-slate-900">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-6 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
        <div className="space-y-3">
          {campaigns.map((campaign) => (
            <div key={campaign.id}>
              {campaign.badgeLabel ? (
                <p className="text-xs font-semibold uppercase tracking-wide text-red-400">
                  {campaign.badgeLabel}
                </p>
              ) : null}
              <h2 className="text-xl font-bold text-white sm:text-2xl">{campaign.title}</h2>
              <p className="mt-1 max-w-2xl text-sm text-slate-300">{campaign.summary}</p>
            </div>
          ))}
        </div>
        <Link
          href={campaigns[0]?.ctaHref || "/vehicles"}
          className="inline-flex shrink-0 items-center justify-center rounded-lg bg-red-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-red-700"
        >
          View offers
        </Link>
      </div>
    </section>
  );
}
