"use client";

import { SiteCampaign } from "@prisma/client";
import { Megaphone, Pencil, Plus, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { CampaignForm } from "@/components/forms/CampaignForm";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { campaignDraftFromSeason, type IndianSeason } from "@/lib/indian-seasons";
import type { PriceSuggestion } from "@/lib/price-suggestions";
import { formatDate, formatPrice } from "@/lib/utils";

type SuggestionsResponse = {
  season: IndianSeason;
  suggestions: PriceSuggestion[];
};

export function OffersPricingPanel() {
  const [campaigns, setCampaigns] = useState<SiteCampaign[]>([]);
  const [season, setSeason] = useState<IndianSeason | null>(null);
  const [suggestions, setSuggestions] = useState<PriceSuggestion[]>([]);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<SiteCampaign | undefined>();
  const [seasonDraft, setSeasonDraft] = useState<ReturnType<typeof campaignDraftFromSeason> | null>(
    null,
  );

  async function load() {
    const [campaignRes, suggestionRes] = await Promise.all([
      fetch("/api/campaigns?all=true"),
      fetch("/api/pricing/suggestions"),
    ]);
    const campaignData = await campaignRes.json();
    const suggestionData = (await suggestionRes.json()) as SuggestionsResponse;
    setCampaigns(Array.isArray(campaignData) ? campaignData : []);
    setSeason(suggestionData.season ?? null);
    setSuggestions(Array.isArray(suggestionData.suggestions) ? suggestionData.suggestions : []);
  }

  useEffect(() => {
    let active = true;
    async function run() {
      try {
        await load();
      } catch {
        toast.error("Failed to load offers");
      } finally {
        if (active) setLoading(false);
      }
    }
    void run();
    return () => {
      active = false;
    };
  }, []);

  const selectedUpdates = useMemo(
    () =>
      suggestions
        .filter((item) => selected[item.id])
        .map((item) => ({ id: item.id, price: item.suggestedPrice })),
    [selected, suggestions],
  );

  async function handleDelete(id: string) {
    if (!confirm("Remove this homepage offer?")) return;
    const res = await fetch(`/api/campaigns?id=${id}`, { method: "DELETE" });
    if (!res.ok) {
      toast.error("Failed to remove offer");
      return;
    }
    toast.success("Offer removed");
    await load();
  }

  async function applyPrices(updates: { id: string; price: number }[]) {
    if (updates.length === 0) {
      toast.error("Select at least one vehicle");
      return;
    }
    setApplying(true);
    try {
      const res = await fetch("/api/pricing/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ updates }),
      });
      const result = await res.json();
      if (!res.ok) {
        toast.error(result.error ?? "Failed to apply prices");
        return;
      }
      toast.success(`Updated ${result.updated} vehicle price${result.updated === 1 ? "" : "s"}`);
      setSelected({});
      await load();
    } catch {
      toast.error("Failed to apply prices");
    } finally {
      setApplying(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-red-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl font-bold text-white">Offers and pricing</h1>
        <p className="mt-1 text-sm text-slate-400">
          Publish festival or monsoon offers on the home page, then apply suggested model prices.
          Suggestions use sold listing prices for the same make and model, adjusted for the current
          Indian calendar window.
        </p>
      </div>

      {season ? (
        <div className="rounded-xl border border-red-500/30 bg-red-950/20 p-5">
          <p className="text-sm font-medium text-red-300">{season.label}</p>
          <p className="mt-1 text-sm text-slate-300">{season.reason}</p>
        </div>
      ) : null}

      <section>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-white">Homepage offers</h2>
          <div className="flex flex-wrap gap-2">
            {season ? (
              <Button
                variant="secondary"
                onClick={() => {
                  setEditing(undefined);
                  setSeasonDraft(campaignDraftFromSeason(season, new Date()));
                  setShowForm(true);
                }}
              >
                Draft from {season.label}
              </Button>
            ) : null}
            <Button
              onClick={() => {
                setEditing(undefined);
                setSeasonDraft(null);
                setShowForm(true);
              }}
            >
              <Plus className="h-4 w-4" />
              New offer
            </Button>
          </div>
        </div>

        {campaigns.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-700/50 bg-slate-800/20 p-10 text-center">
            <Megaphone className="mx-auto mb-3 h-8 w-8 text-slate-500" />
            <p className="text-slate-400">No offers yet. Publish one to show it on the home page.</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-700/50">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-800/80 text-slate-300">
                <tr>
                  <th className="px-4 py-3 font-medium">Offer</th>
                  <th className="px-4 py-3 font-medium">Window</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {campaigns.map((campaign) => (
                  <tr key={campaign.id} className="text-slate-300">
                    <td className="px-4 py-3">
                      <p className="font-medium text-white">{campaign.title}</p>
                      <p className="text-xs text-slate-500">{campaign.kind}</p>
                    </td>
                    <td className="px-4 py-3">
                      {formatDate(campaign.startsAt)} – {formatDate(campaign.endsAt)}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={campaign.published ? "success" : "default"}>
                        {campaign.published ? "Published" : "Draft"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditing(campaign);
                            setSeasonDraft(null);
                            setShowForm(true);
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-400 hover:text-red-300"
                          onClick={() => void handleDelete(campaign.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-white">Suggested model prices</h2>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              disabled={applying}
              onClick={() =>
                void applyPrices(
                  suggestions.map((item) => ({ id: item.id, price: item.suggestedPrice })),
                )
              }
            >
              Apply all suggestions
            </Button>
            <Button
              loading={applying}
              onClick={() => void applyPrices(selectedUpdates)}
            >
              Apply selected
            </Button>
          </div>
        </div>

        {suggestions.length === 0 ? (
          <p className="text-sm text-slate-400">No available vehicles to reprice.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-700/50">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-800/80 text-slate-300">
                <tr>
                  <th className="px-4 py-3" />
                  <th className="px-4 py-3 font-medium">Vehicle</th>
                  <th className="px-4 py-3 font-medium">Current</th>
                  <th className="px-4 py-3 font-medium">Suggested</th>
                  <th className="px-4 py-3 font-medium">Sold sample</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {suggestions.map((item) => (
                  <tr key={item.id} className="text-slate-300">
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={Boolean(selected[item.id])}
                        onChange={(event) =>
                          setSelected((prev) => ({ ...prev, [item.id]: event.target.checked }))
                        }
                      />
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-white">
                        {item.year} {item.make} {item.model}
                      </p>
                      <p className="max-w-md text-xs text-slate-500">{item.reason}</p>
                    </td>
                    <td className="px-4 py-3">{formatPrice(item.currentPrice)}</td>
                    <td className="px-4 py-3 text-white">{formatPrice(item.suggestedPrice)}</td>
                    <td className="px-4 py-3">
                      {item.soldSampleSize > 0
                        ? `${item.soldSampleSize} · ${formatPrice(item.soldAverage ?? 0)}`
                        : "None"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {showForm ? (
        <CampaignForm
          campaign={editing}
          defaults={
            !editing && seasonDraft
              ? {
                  title: seasonDraft.title,
                  summary: seasonDraft.summary,
                  kind: seasonDraft.kind,
                  badgeLabel: seasonDraft.badgeLabel,
                  startsAt: seasonDraft.startsAt,
                  endsAt: seasonDraft.endsAt,
                }
              : undefined
          }
          onSuccess={() => {
            setShowForm(false);
            setEditing(undefined);
            setSeasonDraft(null);
            void load();
          }}
          onCancel={() => {
            setShowForm(false);
            setEditing(undefined);
            setSeasonDraft(null);
          }}
        />
      ) : null}
    </div>
  );
}
