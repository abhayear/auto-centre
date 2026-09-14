"use client";

import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/Button";
import {
  formatMechanicExpertise,
  groupReferralsByMechanic,
  type ReferralRewardState,
} from "@/lib/mechanic-referral";

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
  const groups = useMemo(() => groupReferralsByMechanic(rows), [rows]);

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
          Customers who referred the same mechanic are listed together. ₹500 labour off is per
          customer after hire + 15 days.
        </p>
      </div>
      {groups.length === 0 ? (
        <p className="text-sm text-slate-400">No mechanic referrals yet.</p>
      ) : (
        <div className="space-y-5">
          {groups.map((group) => (
            <section key={group.key} className="overflow-hidden rounded-xl border border-slate-700/50">
              <div className="border-b border-slate-700/50 bg-slate-800/80 px-4 py-3">
                <p className="font-semibold text-white">{group.name}</p>
                <p className="text-xs text-slate-400">
                  {group.contactNo} · {group.address} · {group.yearsOfExpertise} years ·{" "}
                  {formatMechanicExpertise(group.expertise)}
                </p>
                <p className="mt-1 text-sm text-red-300">
                  {group.referrers.length} {group.referrers.length === 1 ? "person referred" : "persons referred"} this mechanic
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="text-slate-400">
                    <tr>
                      <th className="px-4 py-2 font-medium">Person who referred</th>
                      <th className="px-4 py-2 font-medium">Mobile</th>
                      <th className="px-4 py-2 font-medium">Reward</th>
                      <th className="px-4 py-2 font-medium">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/50">
                    {group.referrers.map((row) => (
                      <tr key={row.id} className="text-slate-300">
                        <td className="px-4 py-3 text-white">{row.referrerName || "—"}</td>
                        <td className="px-4 py-3 whitespace-nowrap">{row.referrerContact || "—"}</td>
                        <td className="px-4 py-3">{row.rewardLabel}</td>
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
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
