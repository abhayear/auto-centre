"use client";

import { SiteCampaign } from "@prisma/client";
import { useState } from "react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { CAMPAIGN_KINDS } from "@/lib/validators";

function toLocalInput(value: Date | string | undefined): string | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

type CampaignFormProps = {
  campaign?: SiteCampaign;
  defaults?: Partial<{
    title: string;
    summary: string;
    kind: (typeof CAMPAIGN_KINDS)[number];
    badgeLabel: string;
    startsAt: Date;
    endsAt: Date;
  }>;
  onSuccess: () => void;
  onCancel: () => void;
};

export function CampaignForm({ campaign, defaults, onSuccess, onCancel }: CampaignFormProps) {
  const [loading, setLoading] = useState(false);
  const isEdit = Boolean(campaign);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const data = {
      title: formData.get("title"),
      summary: formData.get("summary"),
      kind: formData.get("kind"),
      badgeLabel: formData.get("badgeLabel") || null,
      ctaHref: formData.get("ctaHref") || "/vehicles",
      startsAt: formData.get("startsAt"),
      endsAt: formData.get("endsAt"),
      published: formData.get("published") === "on",
      sortOrder: Number(formData.get("sortOrder") || 0),
    };

    try {
      const res = await fetch("/api/campaigns", {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(isEdit && campaign ? { id: campaign.id, ...data } : data),
      });
      const result = await res.json();
      if (!res.ok) {
        toast.error(result.error ?? "Failed to save offer");
        return;
      }
      toast.success(isEdit ? "Offer updated" : "Offer created");
      onSuccess();
    } catch {
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal open title={isEdit ? "Edit homepage offer" : "New homepage offer"} onClose={onCancel}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          id="title"
          name="title"
          label="Title"
          required
          defaultValue={campaign?.title ?? defaults?.title ?? ""}
        />
        <div className="space-y-1">
          <label htmlFor="summary" className="block text-sm font-medium text-slate-300">
            Summary
          </label>
          <textarea
            id="summary"
            name="summary"
            required
            rows={3}
            defaultValue={campaign?.summary ?? defaults?.summary ?? ""}
            className="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-white"
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1">
            <label htmlFor="kind" className="block text-sm font-medium text-slate-300">
              Kind
            </label>
            <select
              id="kind"
              name="kind"
              defaultValue={campaign?.kind ?? defaults?.kind ?? "custom"}
              className="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-white"
            >
              {CAMPAIGN_KINDS.map((kind) => (
                <option key={kind} value={kind}>
                  {kind}
                </option>
              ))}
            </select>
          </div>
          <Input
            id="badgeLabel"
            name="badgeLabel"
            label="Badge"
            defaultValue={campaign?.badgeLabel ?? defaults?.badgeLabel ?? ""}
          />
        </div>
        <Input
          id="ctaHref"
          name="ctaHref"
          label="Button link"
          defaultValue={campaign?.ctaHref ?? "/vehicles"}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            id="startsAt"
            name="startsAt"
            label="Starts"
            type="datetime-local"
            required
            defaultValue={toLocalInput(campaign?.startsAt ?? defaults?.startsAt)}
          />
          <Input
            id="endsAt"
            name="endsAt"
            label="Ends"
            type="datetime-local"
            required
            defaultValue={toLocalInput(campaign?.endsAt ?? defaults?.endsAt)}
          />
        </div>
        <Input
          id="sortOrder"
          name="sortOrder"
          label="Sort order"
          type="number"
          defaultValue={campaign?.sortOrder ?? 0}
        />
        <label className="flex items-center gap-2 text-sm text-slate-300">
          <input
            type="checkbox"
            name="published"
            defaultChecked={campaign?.published ?? true}
            className="rounded border-slate-600"
          />
          Publish on the home page during these dates
        </label>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" loading={loading}>
            Save offer
          </Button>
        </div>
      </form>
    </Modal>
  );
}
