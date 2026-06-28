"use client";

import { useEffect, useState } from "react";
import { BarChart3, Globe, Monitor, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { formatVisitLocation } from "@/lib/site-analytics";

type Visit = {
  id: string;
  path: string;
  city: string | null;
  region: string | null;
  country: string | null;
  device: string | null;
  referer: string | null;
  visitedAt: string;
};

type Summary = {
  total: number;
  today: number;
  week: number;
  topPages: { path: string; count: number }[];
  topCities: { city: string; count: number }[];
};

export default function AdminSiteAnalyticsPage() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/site-analytics");
      const data = await res.json();
      if (res.ok) {
        setSummary(data.summary);
        setVisits(data.visits ?? []);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;

    fetch("/api/site-analytics")
      .then((res) => res.json())
      .then((data) => {
        if (!active) return;
        if (data.summary) {
          setSummary(data.summary);
          setVisits(data.visits ?? []);
        }
        setLoading(false);
      })
      .catch(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-red-500 border-t-transparent" />
      </div>
    );
  }

  if (!summary) {
    return <p className="text-slate-400">Unable to load analytics.</p>;
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Site Analytics</h1>
          <p className="mt-1 text-sm text-slate-400">
            Recent visits with page, location, and device. Names and addresses are not collected
            unless visitors submit a form.
          </p>
        </div>
        <Button variant="ghost" onClick={() => void load()}>
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </div>

      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-700/50 bg-slate-800/30 p-5">
          <p className="text-sm text-slate-400">Today</p>
          <p className="mt-1 text-3xl font-bold text-white">{summary.today}</p>
        </div>
        <div className="rounded-xl border border-slate-700/50 bg-slate-800/30 p-5">
          <p className="text-sm text-slate-400">Last 7 days</p>
          <p className="mt-1 text-3xl font-bold text-white">{summary.week}</p>
        </div>
        <div className="rounded-xl border border-slate-700/50 bg-slate-800/30 p-5">
          <p className="text-sm text-slate-400">All time</p>
          <p className="mt-1 text-3xl font-bold text-white">{summary.total}</p>
        </div>
      </div>

      <div className="mb-8 grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-700/50 bg-slate-800/30 p-5">
          <h2 className="mb-4 flex items-center gap-2 font-semibold text-white">
            <BarChart3 className="h-5 w-5 text-red-500" />
            Top pages
          </h2>
          {summary.topPages.length === 0 ? (
            <p className="text-sm text-slate-500">No visits recorded yet.</p>
          ) : (
            <ul className="space-y-2">
              {summary.topPages.map((row) => (
                <li key={row.path} className="flex justify-between text-sm text-slate-300">
                  <span>{row.path}</span>
                  <span className="font-medium text-white">{row.count}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-xl border border-slate-700/50 bg-slate-800/30 p-5">
          <h2 className="mb-4 flex items-center gap-2 font-semibold text-white">
            <Globe className="h-5 w-5 text-red-500" />
            Top cities
          </h2>
          {summary.topCities.length === 0 ? (
            <p className="text-sm text-slate-500">City data appears on Vercel production deploys.</p>
          ) : (
            <ul className="space-y-2">
              {summary.topCities.map((row) => (
                <li key={row.city} className="flex justify-between text-sm text-slate-300">
                  <span>{row.city}</span>
                  <span className="font-medium text-white">{row.count}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-700/50">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-800/80 text-slate-300">
            <tr>
              <th className="px-4 py-3 font-medium">When</th>
              <th className="px-4 py-3 font-medium">Page</th>
              <th className="px-4 py-3 font-medium">Location</th>
              <th className="px-4 py-3 font-medium">Device</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700/50">
            {visits.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-slate-500">
                  No visits yet. Browse the public site to see data here.
                </td>
              </tr>
            ) : (
              visits.map((visit) => (
                <tr key={visit.id} className="text-slate-300">
                  <td className="px-4 py-3 whitespace-nowrap">
                    {new Date(visit.visitedAt).toLocaleString("en-IN", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </td>
                  <td className="px-4 py-3 font-medium text-white">{visit.path}</td>
                  <td className="px-4 py-3">{formatVisitLocation(visit)}</td>
                  <td className="px-4 py-3">
                    <Badge variant="default">
                      <Monitor className="mr-1 inline h-3 w-3" />
                      {visit.device ?? "Unknown"}
                    </Badge>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
