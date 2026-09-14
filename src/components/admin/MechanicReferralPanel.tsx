"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/Button";
import { formatMechanicExpertise, type ReferralRewardState } from "@/lib/mechanic-referral";

type ReferralRow = {
  id: string;
  name: string;
  contactNo: string;
  address: string;
  yearsOfExpertise: number;
  expertise: string[];
  expertiseLabel?: string;
  referrerName: string;
  referrerContact: string;
  hiredAt: string | null;
  rewardedAt: string | null;
  rewardState: ReferralRewardState;
  rewardLabel: string;
  createdAt: string;
};

export function MechanicReferralPanel() {
  const [rows, setRows] = useState<ReferralRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function load() {
    const res = await fetch("/api/mechanic-referrals");
    const data = await res.json();
    setRows(Array.isArray(data) ? data : []);
  }

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, []);

  async function update(id: string, action: "hire" | "reward") {
    setBusyId(id);
    try {
      const res = await fetch("/api/mechanic-referrals", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action }),
      });
      const result = await res.json();
      if (!res.ok) {
        toast.error(result.error ?? "Could not update referral");
        return;
      }
      toast.success(action === "hire" ? "Marked as hired. 15-day stay started." : "₹500 labour off marked as given.");
      await load();
    } catch {
      toast.error("Could not update referral");
    } finally {
      setBusyId(null);
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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Mechanic referrals</h1>
        <p className="mt-1 text-sm text-slate-400">
          Customer gets ₹500 off the next labour bill after the mechanic is hired and stays 15 days.
          Public form: <span className="font-mono text-white">/refer-mechanic</span>
        </p>
      </div>
      {rows.length === 0 ? (
        <p className="text-sm text-slate-400">No mechanic referrals yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-700/50">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-800/80 text-slate-300">
              <tr>
                <th className="px-4 py-3 font-medium">Mechanic</th>
                <th className="px-4 py-3 font-medium">Customer</th>
                <th className="px-4 py-3 font-medium">Expertise</th>
                <th className="px-4 py-3 font-medium">Reward</th>
                <th className="px-4 py-3 font-medium">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {rows.map((row) => (
                <tr key={row.id} className="text-slate-300">
                  <td className="px-4 py-3">
                    <p className="font-medium text-white">{row.name}</p>
                    <p className="text-xs text-slate-400">{row.contactNo}</p>
                    <p className="text-xs text-slate-500">{row.address}</p>
                    <p className="text-xs text-slate-500">{row.yearsOfExpertise} years</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-white">{row.referrerName || "—"}</p>
                    <p className="text-xs text-slate-400">{row.referrerContact || "—"}</p>
                  </td>
                  <td className="px-4 py-3">
                    {row.expertiseLabel ?? formatMechanicExpertise(row.expertise)}
                  </td>
                  <td className="px-4 py-3 text-white">{row.rewardLabel}</td>
                  <td className="px-4 py-3">
                    {row.rewardState === "pending_hire" ? (
                      <Button
                        type="button"
                        size="sm"
                        loading={busyId === row.id}
                        onClick={() => void update(row.id, "hire")}
                      >
                        Mark hired
                      </Button>
                    ) : null}
                    {row.rewardState === "due" ? (
                      <Button
                        type="button"
                        size="sm"
                        loading={busyId === row.id}
                        onClick={() => void update(row.id, "reward")}
                      >
                        Give ₹500 off
                      </Button>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
