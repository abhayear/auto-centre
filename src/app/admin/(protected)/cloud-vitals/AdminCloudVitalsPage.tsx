"use client";

import { useEffect, useState } from "react";
import {
  Activity,
  AlertTriangle,
  Cloud,
  Database,
  ExternalLink,
  Gauge,
  RefreshCw,
  Server,
  TrendingUp,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { statusLabel, type MetricStatus } from "@/lib/system-health";

type VitalMetric = {
  id: string;
  label: string;
  value: string;
  status: MetricStatus;
  detail?: string;
};

type Recommendation = {
  severity: MetricStatus;
  title: string;
  action: string;
};

type HealthReport = {
  generatedAt: string;
  overallStatus: MetricStatus;
  environment: {
    nodeVersion: string;
    vercelRegion: string | null;
    vercelEnv: string | null;
    siteUrl: string | null;
  };
  vitals: VitalMetric[];
  hourlyTraffic: { hour: string; count: number }[];
  recommendations: Recommendation[];
  cloudLinks: { label: string; href: string; description: string }[];
};

function statusBadgeVariant(status: MetricStatus) {
  switch (status) {
    case "ok":
      return "success" as const;
    case "warning":
      return "warning" as const;
    case "critical":
      return "danger" as const;
  }
}

function overallIcon(status: MetricStatus) {
  if (status === "ok") return Activity;
  return AlertTriangle;
}

export default function AdminCloudVitalsPage() {
  const [report, setReport] = useState<HealthReport | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/system-health");
      const data = await res.json();
      if (res.ok) setReport(data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-red-500 border-t-transparent" />
      </div>
    );
  }

  if (!report) {
    return <p className="text-slate-400">Unable to load cloud vitals.</p>;
  }

  const OverallIcon = overallIcon(report.overallStatus);
  const maxTraffic = Math.max(...report.hourlyTraffic.map((row) => row.count), 1);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Cloud Vitals</h1>
          <p className="mt-1 text-sm text-slate-400">
            Live health, traffic load, and performance signals so you can scale before the site
            struggles under heavy visits.
          </p>
        </div>
        <Button variant="ghost" onClick={() => void load()}>
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </div>

      <div className="mb-8 rounded-xl border border-slate-700/50 bg-slate-800/30 p-6">
        <div className="flex flex-wrap items-center gap-4">
          <div className="rounded-full bg-slate-900 p-3">
            <OverallIcon
              className={`h-8 w-8 ${
                report.overallStatus === "ok"
                  ? "text-green-400"
                  : report.overallStatus === "warning"
                    ? "text-yellow-400"
                    : "text-red-400"
              }`}
            />
          </div>
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-xl font-semibold text-white">Overall status</h2>
              <Badge variant={statusBadgeVariant(report.overallStatus)}>
                {statusLabel(report.overallStatus)}
              </Badge>
            </div>
            <p className="mt-1 text-sm text-slate-400">
              Updated{" "}
              {new Date(report.generatedAt).toLocaleString("en-IN", {
                dateStyle: "medium",
                timeStyle: "short",
              })}
              {report.environment.vercelRegion
                ? ` · Region ${report.environment.vercelRegion}`
                : ""}
              {report.environment.vercelEnv ? ` · ${report.environment.vercelEnv}` : ""}
            </p>
          </div>
        </div>
      </div>

      <div className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {report.vitals.map((vital) => (
          <div
            key={vital.id}
            className="rounded-xl border border-slate-700/50 bg-slate-800/30 p-5"
          >
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="text-sm text-slate-400">{vital.label}</p>
              <Badge variant={statusBadgeVariant(vital.status)}>
                {statusLabel(vital.status)}
              </Badge>
            </div>
            <p className="text-2xl font-bold text-white">{vital.value}</p>
            {vital.detail ? (
              <p className="mt-1 text-xs text-slate-500">{vital.detail}</p>
            ) : null}
          </div>
        ))}
      </div>

      <div className="mb-8 grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-700/50 bg-slate-800/30 p-5">
          <h2 className="mb-4 flex items-center gap-2 font-semibold text-white">
            <TrendingUp className="h-5 w-5 text-red-500" />
            Hourly traffic (24h)
          </h2>
          {report.hourlyTraffic.length === 0 ? (
            <p className="text-sm text-slate-500">No visits in the last 24 hours yet.</p>
          ) : (
            <ul className="space-y-3">
              {report.hourlyTraffic.map((row) => (
                <li key={row.hour}>
                  <div className="mb-1 flex justify-between text-xs text-slate-400">
                    <span>
                      {new Date(row.hour).toLocaleString("en-IN", {
                        dateStyle: "short",
                        timeStyle: "short",
                      })}
                    </span>
                    <span className="font-medium text-white">{row.count}</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-900">
                    <div
                      className="h-2 rounded-full bg-red-500/80"
                      style={{ width: `${Math.max(4, (row.count / maxTraffic) * 100)}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-xl border border-slate-700/50 bg-slate-800/30 p-5">
          <h2 className="mb-4 flex items-center gap-2 font-semibold text-white">
            <Gauge className="h-5 w-5 text-red-500" />
            Performance report
          </h2>
          <ul className="space-y-4">
            {report.recommendations.map((item) => (
              <li
                key={`${item.title}-${item.severity}`}
                className="rounded-lg border border-slate-700/40 bg-slate-900/40 p-4"
              >
                <div className="mb-2 flex items-center gap-2">
                  <Badge variant={statusBadgeVariant(item.severity)}>
                    {statusLabel(item.severity)}
                  </Badge>
                  <p className="font-medium text-white">{item.title}</p>
                </div>
                <p className="text-sm text-slate-400">{item.action}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-700/50 bg-slate-800/30 p-5">
          <h2 className="mb-4 flex items-center gap-2 font-semibold text-white">
            <Server className="h-5 w-5 text-red-500" />
            Runtime
          </h2>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-slate-400">Node.js</dt>
              <dd className="text-white">{report.environment.nodeVersion}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-400">Site URL</dt>
              <dd className="text-white">{report.environment.siteUrl ?? "Local dev"}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-400">Vercel region</dt>
              <dd className="text-white">{report.environment.vercelRegion ?? "—"}</dd>
            </div>
          </dl>
        </div>

        <div className="rounded-xl border border-slate-700/50 bg-slate-800/30 p-5">
          <h2 className="mb-4 flex items-center gap-2 font-semibold text-white">
            <Cloud className="h-5 w-5 text-red-500" />
            Cloud dashboards
          </h2>
          <ul className="space-y-3">
            {report.cloudLinks.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-start gap-3 rounded-lg border border-slate-700/40 p-3 transition-colors hover:border-red-500/40 hover:bg-slate-900/50"
                >
                  <Database className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
                  <span className="flex-1">
                    <span className="flex items-center gap-2 font-medium text-white group-hover:text-red-300">
                      {link.label}
                      <ExternalLink className="h-3.5 w-3.5" />
                    </span>
                    <span className="mt-1 block text-xs text-slate-500">{link.description}</span>
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
