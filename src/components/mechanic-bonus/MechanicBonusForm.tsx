"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { MECHANIC_BONUS_SCALE } from "@/lib/mechanic-bonus";

export function MechanicBonusForm() {
  const [names, setNames] = useState<string[]>([]);
  const [ready, setReady] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [billNo, setBillNo] = useState("");
  const [mechanicName, setMechanicName] = useState("");
  const [score, setScore] = useState(0);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/mechanic-bonus")
      .then((res) => res.json())
      .then((data) => {
        const nextNames = Array.isArray(data.roster?.names) ? data.roster.names : [];
        setNames(nextNames);
        setReady(Boolean(data.ready) && nextNames.length > 0);
        setLoaded(true);
      })
      .catch(() => {
        setReady(false);
        setLoaded(true);
      });
  }, []);

  async function handleSubmit() {
    if (!ready) return;
    if (!billNo.trim()) {
      toast.error("Enter the job / bill number");
      return;
    }
    if (!mechanicName) {
      toast.error("Choose one mechanic");
      return;
    }
    if (score < 1) {
      toast.error("Give a rating from 1 to 5");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/mechanic-bonus/ratings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          billNo,
          mechanicName,
          rating: score,
        }),
      });
      const result = await res.json();
      if (!res.ok) {
        toast.error(result.error ?? "Could not save rating");
        return;
      }
      toast.success("Thank you. Rating saved for bonus.");
      setBillNo("");
      setMechanicName("");
      setScore(0);
    } catch {
      toast.error("Could not save rating");
    } finally {
      setSaving(false);
    }
  }

  if (!loaded) {
    return <p className="text-sm text-slate-400">Loading mechanic names…</p>;
  }

  if (!ready) {
    return (
      <p className="rounded-lg border border-amber-600/40 bg-amber-500/10 p-4 text-sm text-amber-100">
        The manager has not named the mechanics yet. Ask the manager to set the names in Admin →
        Mechanic bonus.
      </p>
    );
  }

  return (
    <div className="space-y-5">
      <Input
        id="billNo"
        label="Job / bill number"
        value={billNo}
        onChange={(event) => setBillNo(event.target.value)}
        placeholder="e.g. AG-1042"
      />
      <fieldset className="rounded-xl border border-slate-700/60 bg-slate-900/40 p-4">
        <legend className="px-1 text-sm font-medium text-white">Choose one mechanic</legend>
        <div className="mt-2 space-y-2">
          {names.map((name) => (
            <label key={name} className="flex items-center gap-2 text-sm text-slate-300">
              <input
                type="radio"
                name="mechanicName"
                value={name}
                checked={mechanicName === name}
                onChange={() => setMechanicName(name)}
                className="border-slate-600 bg-slate-800 text-red-600 focus:ring-red-500"
              />
              {name}
            </label>
          ))}
        </div>
      </fieldset>
      <fieldset className="rounded-xl border border-slate-700/60 bg-slate-900/40 p-4">
        <legend className="px-1 text-sm font-medium text-white">Rating</legend>
        <p className="mb-3 text-xs text-slate-500">1 = poor · 5 = excellent (for bonus)</p>
        <div className="flex flex-wrap gap-2">
          {MECHANIC_BONUS_SCALE.map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setScore(value)}
              className={`h-10 w-10 rounded-lg text-sm font-semibold ${
                score === value
                  ? "bg-red-600 text-white"
                  : "border border-slate-600 bg-slate-800 text-slate-200 hover:border-red-500"
              }`}
              aria-pressed={score === value}
            >
              {value}
            </button>
          ))}
        </div>
      </fieldset>
      <div className="flex justify-end">
        <Button type="button" loading={saving} onClick={() => void handleSubmit()}>
          Submit rating
        </Button>
      </div>
    </div>
  );
}
