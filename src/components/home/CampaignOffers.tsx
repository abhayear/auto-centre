import Link from "next/link";
import type { SiteCampaign } from "@prisma/client";

export function CampaignOffers({ campaigns }: { campaigns: SiteCampaign[] }) {
  if (campaigns.length === 0) {
    return (
      <section className="border-b border-slate-800 bg-slate-900/80">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <p className="text-sm text-slate-300">See upcoming festival and monsoon offers on the year calendar.</p>
          <Link href="/offers" className="text-sm font-medium text-red-400 hover:text-red-300">
            View offer calendar
          </Link>
        </div>
      </section>
    );
  }

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
        <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
          <Link
            href="/offers"
            className="inline-flex items-center justify-center rounded-lg border border-red-400/40 px-5 py-2.5 text-sm font-medium text-red-100 hover:bg-red-950/50"
          >
            Year calendar
          </Link>
          <Link
            href={campaigns[0]?.ctaHref || "/vehicles"}
            className="inline-flex items-center justify-center rounded-lg bg-red-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-red-700"
          >
            View offers
          </Link>
        </div>
      </div>
    </section>
  );
}
