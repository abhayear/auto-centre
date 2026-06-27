"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Radius } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

type ServiceCentreSettings = {
  latitude: number;
  longitude: number;
  radiusKm: number;
  radiusCheckEnabled: boolean;
  label: string;
};

export function ServiceCentreSettingsForm() {
  const [settings, setSettings] = useState<ServiceCentreSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/service-centre")
      .then((res) => res.json())
      .then((data) => {
        setSettings(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!settings) return;

    setSaving(true);
    try {
      const res = await fetch("/api/service-centre", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      const result = await res.json();

      if (!res.ok) {
        toast.error(result.error ?? "Failed to save settings");
        return;
      }

      setSettings(result);
      toast.success("Service centre coverage updated");
    } catch {
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="mb-8 rounded-xl border border-slate-700/50 bg-slate-800/30 p-6">
        <div className="h-6 w-48 animate-pulse rounded bg-slate-700" />
      </div>
    );
  }

  if (!settings) return null;

  return (
    <form
      onSubmit={handleSubmit}
      className="mb-8 rounded-xl border border-red-600/20 bg-slate-800/30 p-6"
    >
      <div className="mb-4 flex items-center gap-2">
        <Radius className="h-5 w-5 text-red-500" />
        <h2 className="text-lg font-semibold text-white">Service centre radius</h2>
      </div>
      <p className="mb-4 text-sm text-slate-400">
        When a customer picks a location on Google Maps, we measure distance from your
        service centre. If they are within the radius, the area is serviceable.
      </p>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Input
          id="label"
          label="Centre name"
          value={settings.label}
          onChange={(e) => setSettings({ ...settings, label: e.target.value })}
          required
        />
        <Input
          id="radiusKm"
          type="number"
          label="Service radius (km)"
          min="1"
          step="0.5"
          value={settings.radiusKm}
          onChange={(e) =>
            setSettings({ ...settings, radiusKm: Number(e.target.value) })
          }
          required
        />
        <Input
          id="latitude"
          type="number"
          label="Centre latitude"
          step="any"
          value={settings.latitude}
          onChange={(e) =>
            setSettings({ ...settings, latitude: Number(e.target.value) })
          }
          required
        />
        <Input
          id="longitude"
          type="number"
          label="Centre longitude"
          step="any"
          value={settings.longitude}
          onChange={(e) =>
            setSettings({ ...settings, longitude: Number(e.target.value) })
          }
          required
        />
      </div>

      <label className="mt-4 flex items-center gap-2 text-sm text-slate-300">
        <input
          type="checkbox"
          checked={settings.radiusCheckEnabled}
          onChange={(e) =>
            setSettings({ ...settings, radiusCheckEnabled: e.target.checked })
          }
          className="rounded border-slate-600 bg-slate-800 text-red-600"
        />
        Enable radius check for map / GPS locations
      </label>
      <p className="mt-2 text-xs text-slate-500">
        Manual area names below still apply when customers type without a map location.
      </p>

      <Button type="submit" loading={saving} className="mt-4">
        Save coverage settings
      </Button>
    </form>
  );
}
