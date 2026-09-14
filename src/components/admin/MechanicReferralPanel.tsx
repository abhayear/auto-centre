"use client";

import { useEffect, useState } from "react";
import { formatMechanicExpertise } from "@/lib/mechanic-referral";

type ReferralRow = {
  id: string;
  name: string;
  contactNo: string;
  address: string;
  yearsOfExpertise: number;
  expertise: string[];
  expertiseLabel?: string;
  createdAt: string;
};

export function MechanicReferralPanel() {
  const [rows, setRows] = useState<ReferralRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/mechanic-referrals")
      .then((res) => res.json())
      .then((data) => setRows(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false));
  }, []);

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
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Contact</th>
                <th className="px-4 py-3 font-medium">Address</th>
                <th className="px-4 py-3 font-medium">Years</th>
                <th className="px-4 py-3 font-medium">Expertise</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {rows.map((row) => (
                <tr key={row.id} className="text-slate-300">
                  <td className="px-4 py-3 font-medium text-white">{row.name}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{row.contactNo}</td>
                  <td className="px-4 py-3 max-w-xs">{row.address}</td>
                  <td className="px-4 py-3">{row.yearsOfExpertise}</td>
                  <td className="px-4 py-3">
                    {row.expertiseLabel ?? formatMechanicExpertise(row.expertise)}
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
