"use client";

import { FormEvent, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { SingleImageUploader } from "@/components/forms/SingleImageUploader";
import { mechanicMembers, rosterFromFormData, rosterIsReady, formatRatingSubmittedAt } from "@/lib/mechanic-bonus";

type MechanicRow = {
  name: string;
  photoUrl: string;
};

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

function emptyRow(): MechanicRow {
  return { name: "", photoUrl: "" };
}

export function MechanicBonusPanel() {
  const [mechanics, setMechanics] = useState<MechanicRow[]>([emptyRow()]);
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
    const loaded = mechanicMembers({
      names: Array.isArray(rosterData.roster?.names) ? rosterData.roster.names : [],
      photoUrls: Array.isArray(rosterData.roster?.photoUrls)
        ? rosterData.roster.photoUrls
        : Array.isArray(rosterData.roster?.mechanics)
          ? rosterData.roster.mechanics.map((member: { photoUrl?: string | null }) => member.photoUrl ?? "")
          : [],
    }).map((member) => ({ name: member.name, photoUrl: member.photoUrl ?? "" }));
    setMechanics(loaded.length > 0 ? loaded : [emptyRow()]);
    setRatings(Array.isArray(ratingsData.ratings) ? ratingsData.ratings : []);
    setAverages(Array.isArray(ratingsData.averages) ? ratingsData.averages : []);
  }

  useEffect(() => {
    void load();
  }, []);

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const next = rosterFromFormData(new FormData(event.currentTarget));
    setMechanics(
      next.names.length > 0
        ? next.names.map((name, index) => ({ name, photoUrl: next.photoUrls?.[index] ?? "" }))
        : [emptyRow()],
    );
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
        const detailMessage = Array.isArray(result.details)
          ? result.details.map((detail: { message: string }) => detail.message).join(". ")
          : null;
        toast.error(detailMessage || result.error || "Could not save mechanic names");
        return;
      }
      toast.success("Mechanic names and photos saved");
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
          Add as many working mechanics as you need. Upload a passport-size photo so customers can
          recognise the person they choose.
        </p>
        <p className="mt-2 text-sm text-red-300">
          Customer form: <span className="font-mono text-white">/mechanic-rating</span>
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-4 rounded-xl border border-slate-700/50 p-5">
        <h2 className="text-lg font-semibold text-white">Mechanic names and photos</h2>
        <div className="space-y-4">
          {mechanics.map((mechanic, index) => (
            <div
              key={index}
              className="flex flex-col gap-4 rounded-lg border border-slate-700/60 p-4 sm:flex-row sm:items-start"
            >
              <div className="w-full shrink-0 sm:w-28">
                <SingleImageUploader
                  value={mechanic.photoUrl || null}
                  onChange={(url) =>
                    setMechanics((current) =>
                      current.map((item, i) => (i === index ? { ...item, photoUrl: url ?? "" } : item)),
                    )
                  }
                  category="mechanics"
                  label="Passport photo"
                  emptyHint="Face photo"
                  previewAspect="aspect-[3/4]"
                />
                <input type="hidden" name="mechanicPhoto" value={mechanic.photoUrl} />
              </div>
              <div className="min-w-0 flex-1 space-y-3">
                <Input
                  id={`mechanicName-${index}`}
                  name="mechanicName"
                  label={`Mechanic ${index + 1}`}
                  value={mechanic.name}
                  onChange={(event) =>
                    setMechanics((current) =>
                      current.map((item, i) =>
                        i === index ? { ...item, name: event.target.value } : item,
                      ),
                    )
                  }
                  placeholder="e.g. Ravi"
                  autoComplete="off"
                />
                {mechanics.length > 1 ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setMechanics((current) => current.filter((_, i) => i !== index))}
                  >
                    Remove
                  </Button>
                ) : null}
              </div>
            </div>
          ))}
        </div>
        <div className="flex justify-between">
          <Button
            type="button"
            variant="outline"
            disabled={mechanics.length >= 30}
            onClick={() => setMechanics((current) => [...current, emptyRow()])}
          >
            Add mechanic
          </Button>
          <Button type="submit" loading={saving}>
            Save mechanics
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
                  <th className="px-4 py-3 font-medium">Submitted</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {ratings.map((row) => (
                  <tr key={row.id} className="text-slate-300">
                    <td className="px-4 py-3 text-white">{row.billNo}</td>
                    <td className="px-4 py-3">{row.mechanicName}</td>
                    <td className="px-4 py-3 text-white">{row.rating}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {row.createdAt ? formatRatingSubmittedAt(row.createdAt) : "—"}
                    </td>
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
