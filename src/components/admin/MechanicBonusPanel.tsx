"use client";

import { FormEvent, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { bonusAverage, rosterFromFormData, rosterIsReady } from "@/lib/mechanic-bonus";

type Roster = {
  mechanic1Name: string;
  mechanic2Name: string;
  mechanic3Name: string;
};

type RatingRow = {
  id: string;
  billNo: string;
  mechanic1Name: string;
  mechanic1Rating: number;
  mechanic2Name: string;
  mechanic2Rating: number;
  mechanic3Name: string;
  mechanic3Rating: number;
  bonusAverage: number;
  createdAt: string;
};

const emptyRoster: Roster = {
  mechanic1Name: "",
  mechanic2Name: "",
  mechanic3Name: "",
};

export function MechanicBonusPanel() {
  const [roster, setRoster] = useState<Roster>(emptyRoster);
  const [ratings, setRatings] = useState<RatingRow[]>([]);
  const [errors, setErrors] = useState<Partial<Roster>>({});
  const [saving, setSaving] = useState(false);

  async function load() {
    const [rosterRes, ratingsRes] = await Promise.all([
      fetch("/api/mechanic-bonus"),
      fetch("/api/mechanic-bonus?ratings=true"),
    ]);
    const rosterData = await rosterRes.json();
    const ratingsData = await ratingsRes.json();
    if (rosterData.roster) {
      setRoster({
        mechanic1Name: rosterData.roster.mechanic1Name ?? "",
        mechanic2Name: rosterData.roster.mechanic2Name ?? "",
        mechanic3Name: rosterData.roster.mechanic3Name ?? "",
      });
    }
    setRatings(Array.isArray(ratingsData) ? ratingsData : []);
  }

  useEffect(() => {
    void load();
  }, []);

  function patch(partial: Partial<Roster>) {
    setRoster((current) => ({ ...current, ...partial }));
    setErrors((current) => {
      const next = { ...current };
      for (const key of Object.keys(partial) as (keyof Roster)[]) {
        delete next[key];
      }
      return next;
    });
  }

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const next = rosterFromFormData(new FormData(event.currentTarget));
    setRoster(next);
    if (!rosterIsReady(next)) {
      const fieldErrors: Partial<Roster> = {};
      if (!next.mechanic1Name) fieldErrors.mechanic1Name = "Enter this mechanic's name";
      if (!next.mechanic2Name) fieldErrors.mechanic2Name = "Enter this mechanic's name";
      if (!next.mechanic3Name) fieldErrors.mechanic3Name = "Enter this mechanic's name";
      setErrors(fieldErrors);
      toast.error("Enter all three mechanic names");
      return;
    }
    setSaving(true);
    setErrors({});
    try {
      const res = await fetch("/api/mechanic-bonus", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(next),
      });
      const result = await res.json();
      if (!res.ok) {
        const fieldErrors: Partial<Roster> = {};
        if (Array.isArray(result.details)) {
          for (const item of result.details) {
            if (item.field === "mechanic1Name") fieldErrors.mechanic1Name = item.message;
            if (item.field === "mechanic2Name") fieldErrors.mechanic2Name = item.message;
            if (item.field === "mechanic3Name") fieldErrors.mechanic3Name = item.message;
          }
        }
        setErrors(fieldErrors);
        toast.error(
          Object.values(fieldErrors)[0] ?? result.error ?? "Could not save mechanic names",
        );
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
          Type the three working mechanic names and click Save names. Customers then rate them on
          this website for bonus.
        </p>
        <p className="mt-2 text-sm text-red-300">
          Customer form: <span className="font-mono text-white">/mechanic-rating</span>
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-4 rounded-xl border border-slate-700/50 p-5">
        <h2 className="text-lg font-semibold text-white">Three mechanic names</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <Input
            id="mechanic1Name"
            name="mechanic1Name"
            label="Mechanic 1"
            value={roster.mechanic1Name}
            error={errors.mechanic1Name}
            onChange={(e) => patch({ mechanic1Name: e.target.value })}
            placeholder="e.g. Ravi"
            autoComplete="off"
            required
          />
          <Input
            id="mechanic2Name"
            name="mechanic2Name"
            label="Mechanic 2"
            value={roster.mechanic2Name}
            error={errors.mechanic2Name}
            onChange={(e) => patch({ mechanic2Name: e.target.value })}
            placeholder="e.g. Imran"
            autoComplete="off"
            required
          />
          <Input
            id="mechanic3Name"
            name="mechanic3Name"
            label="Mechanic 3"
            value={roster.mechanic3Name}
            error={errors.mechanic3Name}
            onChange={(e) => patch({ mechanic3Name: e.target.value })}
            placeholder="e.g. Suresh"
            autoComplete="off"
            required
          />
        </div>
        <div className="flex justify-end">
          <Button type="submit" loading={saving}>
            Save names
          </Button>
        </div>
      </form>

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
                  <th className="px-4 py-3 font-medium">{roster.mechanic1Name || "Mechanic 1"}</th>
                  <th className="px-4 py-3 font-medium">{roster.mechanic2Name || "Mechanic 2"}</th>
                  <th className="px-4 py-3 font-medium">{roster.mechanic3Name || "Mechanic 3"}</th>
                  <th className="px-4 py-3 font-medium">Bonus avg</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {ratings.map((row) => (
                  <tr key={row.id} className="text-slate-300">
                    <td className="px-4 py-3 text-white">{row.billNo}</td>
                    <td className="px-4 py-3">{row.mechanic1Rating}</td>
                    <td className="px-4 py-3">{row.mechanic2Rating}</td>
                    <td className="px-4 py-3">{row.mechanic3Rating}</td>
                    <td className="px-4 py-3 text-white">
                      {row.bonusAverage ?? bonusAverage([row.mechanic1Rating, row.mechanic2Rating, row.mechanic3Rating])}
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
