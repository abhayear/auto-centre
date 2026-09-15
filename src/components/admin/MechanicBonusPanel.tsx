"use client";

import { FormEvent, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { rosterFromFormData, rosterIsReady } from "@/lib/mechanic-bonus";

type RatingRow = {
  id: string;
  billNo: string;
  mechanicName: string;
  rating: number;
  createdAt: string;
};

type AverageRow = {
  mechanicName: string;
  count: number;
  average: number;
};

export function MechanicBonusPanel() {
  const [names, setNames] = useState<string[]>([""]);
  const [ratings, setRatings] = useState<RatingRow[]>([]);
  const [averages, setAverages] = useState<AverageRow[]>([]);
  const [saving, setSaving] = useState(false);

  async function load() {
    const [rosterRes, ratingsRes] = await Promise.all([
      fetch("/api/mechanic-bonus"),
      fetch("/api/mechanic-bonus?ratings=true"),
    ]);
    const rosterData = await rosterRes.json();
    const ratingsData = await ratingsRes.json();
    const loadedNames = Array.isArray(rosterData.roster?.names) ? rosterData.roster.names : [];
    setNames(loadedNames.length > 0 ? loadedNames : [""]);
    setRatings(Array.isArray(ratingsData.ratings) ? ratingsData.ratings : []);
    setAverages(Array.isArray(ratingsData.averages) ? ratingsData.averages : []);
  }

  useEffect(() => {
    void load();
  }, []);

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const next = rosterFromFormData(new FormData(event.currentTarget));
    setNames(next.names.length > 0 ? next.names : [""]);
    if (!rosterIsReady(next)) {
      toast.error("Add at least one mechanic name");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/mechanic-bonus", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(next),
      });
      const result = await res.json();
      if (!res.ok) {
        toast.error(result.error ?? "Could not save mechanic names");
        return;
      }
      toast.success("Mechanic names saved");
      await load();
    } catch {
      toast.error("Could not save mechanic names. Try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl font-bold text-white">Mechanic bonus ratings</h1>
        <p className="mt-1 text-sm text-slate-400">
          Add as many working mechanics as you need. The customer picks only one mechanic and gives
          a 1–5 score for bonus.
        </p>
        <p className="mt-2 text-sm text-red-300">
          Customer form: <span className="font-mono text-white">/mechanic-rating</span>
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-4 rounded-xl border border-slate-700/50 p-5">
        <h2 className="text-lg font-semibold text-white">Mechanic names</h2>
        <div className="space-y-3">
          {names.map((name, index) => (
            <div key={index} className="flex items-end gap-2">
              <div className="flex-1">
                <Input
                  id={`mechanicName-${index}`}
                  name="mechanicName"
                  label={`Mechanic ${index + 1}`}
                  defaultValue={name}
                  placeholder="e.g. Ravi"
                  autoComplete="off"
                />
              </div>
              {names.length > 1 ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setNames((current) => current.filter((_, i) => i !== index))}
                >
                  Remove
                </Button>
              ) : null}
            </div>
          ))}
        </div>
        <div className="flex justify-between">
          <Button type="button" variant="outline" onClick={() => setNames((current) => [...current, ""])}>
            Add mechanic
          </Button>
          <Button type="submit" loading={saving}>
            Save names
          </Button>
        </div>
      </form>

      {averages.length > 0 ? (
        <section>
          <h2 className="mb-3 text-lg font-semibold text-white">Bonus average by mechanic</h2>
          <div className="overflow-x-auto rounded-xl border border-slate-700/50">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-800/80 text-slate-300">
                <tr>
                  <th className="px-4 py-3 font-medium">Mechanic</th>
                  <th className="px-4 py-3 font-medium">Ratings</th>
                  <th className="px-4 py-3 font-medium">Average</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {averages.map((row) => (
                  <tr key={row.mechanicName} className="text-slate-300">
                    <td className="px-4 py-3 text-white">{row.mechanicName}</td>
                    <td className="px-4 py-3">{row.count}</td>
                    <td className="px-4 py-3 text-white">{row.average}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      <section>
        <h2 className="mb-3 text-lg font-semibold text-white">Customer ratings</h2>
        {ratings.length === 0 ? (
          <p className="text-sm text-slate-400">No ratings yet.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-700/50">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-800/80 text-slate-300">
                <tr>
                  <th className="px-4 py-3 font-medium">Bill</th>
                  <th className="px-4 py-3 font-medium">Mechanic</th>
                  <th className="px-4 py-3 font-medium">Rating</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {ratings.map((row) => (
                  <tr key={row.id} className="text-slate-300">
                    <td className="px-4 py-3 text-white">{row.billNo}</td>
                    <td className="px-4 py-3">{row.mechanicName}</td>
                    <td className="px-4 py-3 text-white">{row.rating}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
