export type MetricStatus = "ok" | "warning" | "critical";

export type VitalMetric = {
  id: string;
  label: string;
  value: string;
  numericValue?: number;
  unit?: string;
  status: MetricStatus;
  detail?: string;
};

export type HealthRecommendation = {
  severity: MetricStatus;
  title: string;
  action: string;
};

export type HourlyTraffic = {
  hour: string;
  count: number;
};

export type WebVitalSummary = {
  name: string;
  avg: number;
  p75: number;
  count: number;
  status: MetricStatus;
};

export const THRESHOLDS = {
  dbLatencyMs: { warning: 300, critical: 1500 },
  visitsPerHour: { warning: 500, critical: 2000 },
  visitsToday: { warning: 5000, critical: 20000 },
  heapUsedMb: { warning: 256, critical: 512 },
  siteVisitRows: { warning: 100_000, critical: 500_000 },
  lcpMs: { warning: 2500, critical: 4000 },
  inpMs: { warning: 200, critical: 500 },
  cls: { warning: 0.1, critical: 0.25 },
  ttfbMs: { warning: 800, critical: 1800 },
} as const;

export function evaluateThreshold(
  value: number,
  limits: { warning: number; critical: number },
  higherIsWorse = true,
): MetricStatus {
  if (higherIsWorse) {
    if (value >= limits.critical) return "critical";
    if (value >= limits.warning) return "warning";
    return "ok";
  }

  if (value <= limits.critical) return "critical";
  if (value <= limits.warning) return "warning";
  return "ok";
}

export function worstStatus(statuses: MetricStatus[]): MetricStatus {
  if (statuses.includes("critical")) return "critical";
  if (statuses.includes("warning")) return "warning";
  return "ok";
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export function formatMs(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)} ms`;
  return `${(ms / 1000).toFixed(2)} s`;
}

export function statusLabel(status: MetricStatus): string {
  switch (status) {
    case "ok":
      return "Healthy";
    case "warning":
      return "Warning";
    case "critical":
      return "Critical";
  }
}

export function buildRecommendations(input: {
  dbLatencyMs: number;
  visitsLastHour: number;
  visitsToday: number;
  siteVisitRows: number;
  webVitals: WebVitalSummary[];
  databaseOk: boolean;
}): HealthRecommendation[] {
  const recommendations: HealthRecommendation[] = [];

  if (!input.databaseOk) {
    recommendations.push({
      severity: "critical",
      title: "Database unreachable",
      action:
        "Check Neon status, DATABASE_URL on Vercel, and connection limits. Site forms and admin will fail until restored.",
    });
  }

  if (input.dbLatencyMs >= THRESHOLDS.dbLatencyMs.warning) {
    recommendations.push({
      severity: evaluateThreshold(input.dbLatencyMs, THRESHOLDS.dbLatencyMs),
      title: "Database response is slow",
      action:
        "Upgrade Neon compute, enable connection pooling, or prune old SiteVisit / WebVitalsSample rows to reduce load.",
    });
  }

  if (input.visitsLastHour >= THRESHOLDS.visitsPerHour.warning) {
    recommendations.push({
      severity: evaluateThreshold(input.visitsLastHour, THRESHOLDS.visitsPerHour),
      title: "High traffic in the last hour",
      action:
        "Monitor Vercel usage, consider Pro plan for higher concurrency, and ensure Neon autoscaling is enabled.",
    });
  }

  if (input.visitsToday >= THRESHOLDS.visitsToday.warning) {
    recommendations.push({
      severity: evaluateThreshold(input.visitsToday, THRESHOLDS.visitsToday),
      title: "Daily visit volume is elevated",
      action:
        "Review Site Analytics peak hours below. Schedule content updates off-peak and archive old analytics if counts grow large.",
    });
  }

  if (input.siteVisitRows >= THRESHOLDS.siteVisitRows.warning) {
    recommendations.push({
      severity: evaluateThreshold(input.siteVisitRows, THRESHOLDS.siteVisitRows),
      title: "Analytics table is large",
      action:
        "Export or delete visits older than 90 days to keep queries fast and avoid storage pressure on Neon.",
    });
  }

  for (const vital of input.webVitals) {
    if (vital.status === "ok") continue;

    const actionByName: Record<string, string> = {
      LCP: "Compress hero images, use Next.js Image, and reduce above-the-fold JavaScript.",
      INP: "Reduce client-side work on click handlers and defer non-critical scripts.",
      CLS: "Set explicit width/height on images and reserve space for dynamic banners.",
      TTFB: "Check database latency, enable caching on public pages, and review cold starts on Vercel.",
    };

    recommendations.push({
      severity: vital.status,
      title: `${vital.name} needs improvement (${Math.round(vital.p75)} median)`,
      action: actionByName[vital.name] ?? "Review page performance in browser DevTools.",
    });
  }

  if (recommendations.length === 0) {
    recommendations.push({
      severity: "ok",
      title: "All vitals within safe limits",
      action:
        "Keep monitoring this dashboard during campaigns. Re-check after marketing pushes or festival-season traffic.",
    });
  }

  return recommendations;
}

export function summarizeWebVital(
  name: string,
  values: number[],
): WebVitalSummary | null {
  if (values.length === 0) return null;

  const sorted = [...values].sort((a, b) => a - b);
  const avg = values.reduce((sum, value) => sum + value, 0) / values.length;
  const p75Index = Math.min(sorted.length - 1, Math.floor(sorted.length * 0.75));
  const p75 = sorted[p75Index];

  let limits: { warning: number; critical: number };
  switch (name) {
    case "LCP":
      limits = THRESHOLDS.lcpMs;
      break;
    case "INP":
      limits = THRESHOLDS.inpMs;
      break;
    case "CLS":
      limits = THRESHOLDS.cls;
      break;
    case "TTFB":
      limits = THRESHOLDS.ttfbMs;
      break;
    default:
      limits = { warning: Number.MAX_SAFE_INTEGER, critical: Number.MAX_SAFE_INTEGER };
  }

  return {
    name,
    avg,
    p75,
    count: values.length,
    status: evaluateThreshold(p75, limits),
  };
}
