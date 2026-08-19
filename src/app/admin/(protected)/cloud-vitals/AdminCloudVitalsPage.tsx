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
import { CloudVitalsAssistant } from "@/components/admin/CloudVitalsAssistant";
import { getDynamicSuggestedPrompts } from "@/lib/cloud-vitals-advisor";
import type { MonitorSignal } from "@/lib/health/signals";
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

type HealthMonitor = {
  signals: MonitorSignal[];
  openAlerts: {
    id: string;
    severity: MetricStatus;
    title: string;
    detail: string;
    suggestedAction: string;
  }[];
  recentSnapshots: {
    createdAt: string;
    overallStatus: MetricStatus;
  }[];
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
  monitor?: HealthMonitor;
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

export function MonitoringAlerts({ monitor }: { monitor: HealthMonitor }) {
  return (
    <section className="mb-8 rounded-xl border border-slate-700/50 bg-slate-800/30 p-5">
      <h2 className="mb-4 flex items-center gap-2 font-semibold text-white">
        <AlertTriangle className="h-5 w-5 text-red-500" />
        Monitoring alerts
      </h2>

      {monitor.openAlerts.length === 0 ? (
        <p className="mb-6 text-sm text-slate-400">No open alerts.</p>
      ) : (
        <ul className="mb-6 grid gap-3 lg:grid-cols-2">
          {monitor.openAlerts.map((alert) => (
            <li
              key={alert.id}
              className="rounded-lg border border-slate-700/40 bg-slate-900/40 p-4"
            >
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <Badge variant={statusBadgeVariant(alert.severity)}>
                  {statusLabel(alert.severity)}
                </Badge>
                <p className="font-medium text-white">{alert.title}</p>
              </div>
              <p className="text-sm text-slate-400">{alert.detail}</p>
              <p className="mt-3 text-sm text-slate-400">
                <span className="font-semibold text-slate-300">Suggested action</span>:{" "}
                {alert.suggestedAction}
              </p>
            </li>
          ))}
        </ul>
      )}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[48rem] text-left text-sm">
          <thead className="border-b border-slate-700 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-3 py-2 font-medium">Label</th>
              <th className="px-3 py-2 font-medium">Value</th>
              <th className="px-3 py-2 font-medium">Threshold</th>
              <th className="px-3 py-2 font-medium">Status</th>
              <th className="px-3 py-2 font-medium">Suggested action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700/50">
            {monitor.signals.map((signal) => (
              <tr key={signal.id}>
                <td className="px-3 py-3 font-medium text-white">{signal.label}</td>
                <td className="px-3 py-3 text-slate-300">{signal.value}</td>
                <td className="px-3 py-3 text-slate-400">{signal.threshold}</td>
                <td className="px-3 py-3">
                  <Badge variant={statusBadgeVariant(signal.status)}>
                    {statusLabel(signal.status)}
                  </Badge>
                </td>
                <td className="px-3 py-3 text-slate-400">{signal.suggestedAction}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {monitor.signals.length === 0 ? (
          <p className="px-3 py-4 text-sm text-slate-500">No monitoring signals yet.</p>
        ) : null}
      </div>

      <div className="mt-6 border-t border-slate-700/50 pt-5">
        <h3 className="mb-3 text-sm font-semibold text-white">Recent snapshots</h3>
        {monitor.recentSnapshots.length === 0 ? (
          <p className="text-sm text-slate-500">No snapshots yet.</p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {monitor.recentSnapshots.map((snapshot) => (
              <li
                key={snapshot.createdAt}
                className="flex items-center gap-2 rounded-lg border border-slate-700/40 bg-slate-900/40 px-3 py-2"
              >
                <time className="text-xs text-slate-400" dateTime={snapshot.createdAt}>
                  {new Date(snapshot.createdAt).toLocaleString("en-IN", {
                    dateStyle: "short",
                    timeStyle: "short",
                  })}
                </time>
                <Badge variant={statusBadgeVariant(snapshot.overallStatus)}>
                  {statusLabel(snapshot.overallStatus)}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

async function fetchHealthReport(): Promise<HealthReport | null> {
  try {
    const response = await fetch("/api/system-health");
    const data = await response.json();
    return response.ok ? data : null;
  } catch {
    return null;
  }
}

export default function AdminCloudVitalsPage() {
  const [report, setReport] = useState<HealthReport | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const nextReport = await fetchHealthReport();
      if (nextReport) setReport(nextReport);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;
    void fetchHealthReport().then((nextReport) => {
      if (!active) return;
      if (nextReport) setReport(nextReport);
      setLoading(false);
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

  if (!report) {
    return <p className="text-slate-400">Unable to load cloud vitals.</p>;
  }

  const maxTraffic = Math.max(...report.hourlyTraffic.map((row) => row.count), 1);
  const suggestedPrompts = getDynamicSuggestedPrompts({
    generatedAt: report.generatedAt,
    overallStatus: report.overallStatus,
    environment: report.environment,
    vitals: report.vitals,
    hourlyTraffic: report.hourlyTraffic,
    peakHour: null,
    recommendations: report.recommendations,
  });

  return (
    <div className="xl:grid xl:grid-cols-[minmax(0,1fr)_22rem] xl:items-start xl:gap-6">
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
            {report.overallStatus === "ok" ? (
              <Activity className="h-8 w-8 text-green-400" />
            ) : (
              <AlertTriangle
                className={`h-8 w-8 ${
                  report.overallStatus === "warning" ? "text-yellow-400" : "text-red-400"
                }`}
              />
            )}
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

      {report.monitor ? <MonitoringAlerts monitor={report.monitor} /> : null}

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

      <div className="mt-6 xl:sticky xl:top-6 xl:mt-0">
        <CloudVitalsAssistant suggestedPrompts={suggestedPrompts} />
      </div>
    </div>
  );
}
