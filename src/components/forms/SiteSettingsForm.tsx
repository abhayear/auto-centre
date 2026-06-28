"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Bell, Clock, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import type { BusinessHour } from "@/lib/site-settings";

type SiteSettingsFormData = {
  businessHours: BusinessHour[];
  noticeText: string;
  noticeActive: boolean;
};

export function SiteSettingsForm() {
  const [settings, setSettings] = useState<SiteSettingsFormData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/site-settings")
      .then((res) => res.json())
      .then((data) => {
        setSettings({
          businessHours: data.businessHours ?? [],
          noticeText: data.noticeText ?? "",
          noticeActive: Boolean(data.noticeActive),
        });
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  function updateHour(index: number, field: keyof BusinessHour, value: string) {
    if (!settings) return;
    const businessHours = settings.businessHours.map((row, i) =>
      i === index ? { ...row, [field]: value } : row
    );
    setSettings({ ...settings, businessHours });
  }

  function addHourRow() {
    if (!settings) return;
    setSettings({
      ...settings,
      businessHours: [...settings.businessHours, { day: "", hours: "" }],
    });
  }

  function removeHourRow(index: number) {
    if (!settings || settings.businessHours.length <= 1) return;
    setSettings({
      ...settings,
      businessHours: settings.businessHours.filter((_, i) => i !== index),
    });
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!settings) return;

    setSaving(true);
    try {
      const res = await fetch("/api/site-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessHours: settings.businessHours,
          noticeText: settings.noticeText.trim() || null,
          noticeActive: settings.noticeActive,
        }),
      });
      const result = await res.json();

      if (!res.ok) {
        const detail = result.details?.[0]?.message;
        toast.error(detail ?? result.error ?? "Failed to save settings");
        return;
      }

      setSettings({
        businessHours: result.businessHours,
        noticeText: result.noticeText ?? "",
        noticeActive: result.noticeActive,
      });
      window.dispatchEvent(new CustomEvent("site-settings-updated"));
      toast.success("Site settings updated");
    } catch {
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="rounded-xl border border-slate-700/50 bg-slate-800/30 p-6">
        <div className="h-6 w-48 animate-pulse rounded bg-slate-700" />
      </div>
    );
  }

  if (!settings) return null;

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <section className="rounded-xl border border-slate-700/50 bg-slate-800/30 p-6">
        <div className="mb-4 flex items-center gap-2">
          <Clock className="h-5 w-5 text-red-500" />
          <h2 className="text-lg font-semibold text-white">Business hours</h2>
        </div>
        <p className="mb-4 text-sm text-slate-400">
          Shown on the contact page. Update timings for festivals, holidays, or seasonal changes.
        </p>

        <div className="space-y-3">
          {settings.businessHours.map((row, index) => (
            <div key={index} className="flex flex-col gap-2 sm:flex-row sm:items-end">
              <div className="flex-1">
                <Input
                  id={`day-${index}`}
                  label={index === 0 ? "Day / period" : undefined}
                  value={row.day}
                  onChange={(e) => updateHour(index, "day", e.target.value)}
                  placeholder="e.g. Monday – Saturday"
                  required
                />
              </div>
              <div className="flex-1">
                <Input
                  id={`hours-${index}`}
                  label={index === 0 ? "Hours" : undefined}
                  value={row.hours}
                  onChange={(e) => updateHour(index, "hours", e.target.value)}
                  placeholder="e.g. 9:00 AM – 7:00 PM"
                  required
                />
              </div>
              <Button
                type="button"
                variant="ghost"
                className="shrink-0 text-slate-400 hover:text-red-400"
                disabled={settings.businessHours.length <= 1}
                onClick={() => removeHourRow(index)}
                aria-label="Remove row"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>

        <Button type="button" variant="ghost" className="mt-3" onClick={addHourRow}>
          <Plus className="h-4 w-4" />
          Add timing row
        </Button>
      </section>

      <section className="rounded-xl border border-amber-600/20 bg-slate-800/30 p-6">
        <div className="mb-4 flex items-center gap-2">
          <Bell className="h-5 w-5 text-amber-400" />
          <h2 className="text-lg font-semibold text-white">Site notice</h2>
        </div>
        <p className="mb-4 text-sm text-slate-400">
          Display a banner at the top of the website — e.g. holiday closure, festival offers, or
          service delays.
        </p>

        <label className="mb-4 flex items-center gap-2 text-sm text-slate-300">
          <input
            type="checkbox"
            checked={settings.noticeActive}
            onChange={(e) => setSettings({ ...settings, noticeActive: e.target.checked })}
            className="rounded border-slate-600 bg-slate-800 text-red-600"
          />
          Show notice banner on the website
        </label>

        <label htmlFor="noticeText" className="mb-1 block text-sm font-medium text-slate-300">
          Notice message
        </label>
        <textarea
          id="noticeText"
          value={settings.noticeText}
          onChange={(e) => setSettings({ ...settings, noticeText: e.target.value })}
          rows={3}
          maxLength={500}
          placeholder="e.g. Closed on Holi — reopening 15 March. Doorstep service available as usual."
          className="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-white placeholder:text-slate-500 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
        />
        <p className="mt-1 text-xs text-slate-500">{settings.noticeText.length}/500 characters</p>
      </section>

      <Button type="submit" loading={saving}>
        Save site settings
      </Button>
    </form>
  );
}
