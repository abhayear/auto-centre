"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { MECHANIC_BONUS_SCALE } from "@/lib/mechanic-bonus";

type Roster = {
  mechanic1Name: string;
  mechanic2Name: string;
  mechanic3Name: string;
};

function ScoreRow({
  name,
  value,
  onChange,
}: {
  name: string;
  value: number;
  onChange: (score: number) => void;
}) {
  return (
    <fieldset className="rounded-xl border border-slate-700/60 bg-slate-900/40 p-4">
      <legend className="px-1 text-sm font-medium text-white">{name}</legend>
      <p className="mb-3 text-xs text-slate-500">1 = poor · 5 = excellent (for bonus)</p>
      <div className="flex flex-wrap gap-2">
        {MECHANIC_BONUS_SCALE.map((score) => (
          <button
            key={score}
            type="button"
            onClick={() => onChange(score)}
            className={`h-10 w-10 rounded-lg text-sm font-semibold ${
              value === score
                ? "bg-red-600 text-white"
                : "border border-slate-600 bg-slate-800 text-slate-200 hover:border-red-500"
            }`}
            aria-pressed={value === score}
          >
            {score}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

export function MechanicBonusForm() {
  const [roster, setRoster] = useState<Roster | null>(null);
  const [ready, setReady] = useState(false);
  const [billNo, setBillNo] = useState("");
  const [scores, setScores] = useState<[number, number, number]>([0, 0, 0]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/mechanic-bonus")
      .then((res) => res.json())
      .then((data) => {
        setRoster(data.roster);
        setReady(Boolean(data.ready));
      })
      .catch(() => setReady(false));
  }, []);

  async function handleSubmit() {
    if (!ready || !roster) return;
    if (!billNo.trim()) {
      toast.error("Enter the job / bill number");
      return;
    }
    if (scores.some((score) => score < 1)) {
      toast.error("Give each mechanic a rating from 1 to 5");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/mechanic-bonus/ratings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          billNo,
          mechanic1Rating: scores[0],
          mechanic2Rating: scores[1],
          mechanic3Rating: scores[2],
        }),
      });
      const result = await res.json();
      if (!res.ok) {
        toast.error(result.error ?? "Could not save rating");
        return;
      }
      toast.success("Thank you. Rating saved for bonus.");
      setBillNo("");
      setScores([0, 0, 0]);
    } catch {
      toast.error("Could not save rating");
    } finally {
      setSaving(false);
    }
  }

  if (!roster) {
    return <p className="text-sm text-slate-400">Loading mechanic names…</p>;
  }

  if (!ready) {
    return (
      <p className="rounded-lg border border-amber-600/40 bg-amber-500/10 p-4 text-sm text-amber-100">
        The manager has not named the three mechanics yet. Ask the manager to set the names in
        Admin → Mechanic bonus.
      </p>
    );
  }

  const names = [roster.mechanic1Name, roster.mechanic2Name, roster.mechanic3Name];

  return (
    <div className="space-y-5">
      <Input
        id="billNo"
        label="Job / bill number"
        value={billNo}
        onChange={(event) => setBillNo(event.target.value)}
        placeholder="e.g. AG-1042"
      />
      {names.map((name, index) => (
        <ScoreRow
          key={name}
          name={name}
          value={scores[index]}
          onChange={(score) =>
            setScores((current) => {
              const next = [...current] as [number, number, number];
              next[index] = score;
              return next;
            })
          }
        />
      ))}
      <div className="flex justify-end">
        <Button type="button" loading={saving} onClick={() => void handleSubmit()}>
          Submit rating
        </Button>
      </div>
    </div>
  );
}
