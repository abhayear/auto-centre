import { OfferYearCalendar } from "@/components/admin/OfferYearCalendar";
import { findPublishedCampaigns } from "@/lib/campaigns";
import { safeDbQuery } from "@/lib/safe-db";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Offer calendar",
  description: "See live and upcoming Auto Galaxy offers for the whole year.",
};

export const dynamic = "force-dynamic";

export default async function OffersPage() {
  const campaigns = await safeDbQuery(() => findPublishedCampaigns(), []);

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold text-white">Offer calendar</h1>
      <p className="mt-2 text-slate-400">
        View this year&apos;s published offers in advance. Sky-blue bars are upcoming. Red bars are
        live now. You can also move to next year with the arrows.
      </p>
      <div className="mt-8">
        <OfferYearCalendar offers={campaigns} mode="public" />
      </div>
    </div>
  );
}
