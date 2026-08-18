import { evaluateThreshold, type MetricStatus } from "@/lib/system-health";

export const MONITOR_SIGNAL_IDS = [
  "availability",
  "response_time",
  "http_5xx",
  "api_errors",
  "function_failures",
  "traffic_spike",
  "vercel_usage",
  "database",
] as const;

export type MonitorSignalId = (typeof MONITOR_SIGNAL_IDS)[number];

export type MonitorSignal = {
  id: MonitorSignalId;
  label: string;
  value: string;
  numericValue?: number;
  threshold: string;
  status: MetricStatus;
  suggestedAction: string;
  detail?: string;
};

export const SUGGESTED_ACTIONS: Record<MonitorSignalId, string> = {
  availability:
    "Check the latest Vercel deployment and DNS for autogalaxy.in. Confirm `/api/health`.",
  response_time:
    "Check Neon latency on Cloud Vitals, then Vercel function duration and cold starts.",
  http_5xx:
    "Open Vercel function logs for 5xx. Roll back the last deploy if the spike started then.",
  api_errors:
    "Identify the failing route group from the snapshot. Check database, auth, and env for that route.",
  function_failures:
    "Inspect that function in Vercel. Redeploy or raise memory/timeout if duration is maxed.",
  traffic_spike:
    "Watch Vercel and Neon limits. Pause ads or campaigns if usage is also high.",
  vercel_usage: "Upgrade the Vercel plan or cut bandwidth / function duration.",
  database:
    "Check Neon status, pooling (`DATABASE_URL` pooler), and connection limit. Restart compute only if Neon shows idle-fail.",
};

export const COLLECTOR_FAILED_ACTION = "collector failed, retry next run";

const LABELS: Record<MonitorSignalId, string> = {
  availability: "Site availability",
  response_time: "Response time",
  http_5xx: "HTTP 5xx rate",
  api_errors: "API error jump",
  function_failures: "Function failures",
  traffic_spike: "Traffic spike",
  vercel_usage: "Vercel usage",
  database: "Database",
};

function signal(
  id: MonitorSignalId,
  status: MetricStatus,
  value: string,
  threshold: string,
  numericValue?: number,
  detail?: string,
): MonitorSignal {
  return {
    id,
    label: LABELS[id],
    value,
    numericValue,
    threshold,
    status,
    suggestedAction: status === "ok" ? "No action required." : SUGGESTED_ACTIONS[id],
    detail,
  };
}

export function signalStatusRequiresAction(status: MetricStatus): boolean {
  return status === "warning" || status === "critical";
}

export function evaluateAvailability(input: {
  ok: boolean;
  consecutiveFailures: number;
}): MonitorSignal {
  if (input.ok) {
    return signal("availability", "ok", "Up", "2 consecutive failures = critical");
  }
  const status: MetricStatus = input.consecutiveFailures >= 2 ? "critical" : "warning";
  return signal(
    "availability",
    status,
    input.consecutiveFailures >= 2 ? "Down (2 checks)" : "Down (1 check)",
    "2 consecutive failures = critical",
    input.consecutiveFailures,
  );
}

export function evaluateResponseTime(input: {
  homeMs: number | null;
  healthMs: number | null;
}): MonitorSignal {
  const samples = [input.homeMs, input.healthMs].filter((ms): ms is number => ms != null);
  const slowest = samples.length === 0 ? 0 : Math.max(...samples);
  const status = evaluateThreshold(slowest, { warning: 3000, critical: 5000 });
  return signal(
    "response_time",
    status,
    `${Math.round(slowest)} ms`,
    "> 3s warning, > 5s critical",
    slowest,
  );
}

export function evaluateHttp5xx(input: { fiveXx: number; total: number }): MonitorSignal {
  const rate = input.total === 0 ? 0 : (input.fiveXx / input.total) * 100;
  const status = evaluateThreshold(rate, { warning: 2, critical: 5 });
  return signal(
    "http_5xx",
    status,
    `${rate.toFixed(1)}%`,
    "> 2% warning, > 5% critical",
    rate,
  );
}

export function evaluateSpike(input: { current: number; baseline: number }): MonitorSignal {
  if (input.baseline < 20) {
    return signal(
      "traffic_spike",
      "ok",
      String(input.current),
      "3× warning / 5× critical; skipped if baseline < 20",
      input.current,
      "baseline too small",
    );
  }
  const factor = input.current / input.baseline;
  const status = evaluateThreshold(factor, { warning: 3, critical: 5 });
  return signal(
    "traffic_spike",
    status,
    `${input.current} (${factor.toFixed(1)}×)`,
    "3× warning / 5× critical; skipped if baseline < 20",
    factor,
  );
}

export function evaluateApiErrorSpike(input: {
  current: number;
  baseline: number;
}): MonitorSignal {
  const row = evaluateSpike(input);
  return {
    ...row,
    id: "api_errors",
    label: LABELS.api_errors,
    suggestedAction:
      row.status === "ok" ? "No action required." : SUGGESTED_ACTIONS.api_errors,
  };
}

export function evaluateFunctionFailureSpike(input: {
  current: number;
  baseline: number;
}): MonitorSignal {
  const row = evaluateSpike(input);
  return {
    ...row,
    id: "function_failures",
    label: LABELS.function_failures,
    suggestedAction:
      row.status === "ok" ? "No action required." : SUGGESTED_ACTIONS.function_failures,
  };
}

export function evaluateVercelUsage(input: {
  configured: boolean;
  percent: number | null;
}): MonitorSignal {
  if (!input.configured || input.percent == null) {
    return signal("vercel_usage", "ok", "usage API not configured", "≥ 80% warning, ≥ 95% critical");
  }
  const status = evaluateThreshold(input.percent, { warning: 80, critical: 95 });
  return signal(
    "vercel_usage",
    status,
    `${Math.round(input.percent)}%`,
    "≥ 80% warning, ≥ 95% critical",
    input.percent,
  );
}

export function evaluateDatabase(input: {
  ok: boolean;
  latencyMs: number;
  connections: number | null;
  maxConnections: number | null;
}): MonitorSignal {
  if (!input.ok) {
    return signal("database", "critical", "Unreachable", "300ms / 80% warning; 1500ms / 95% critical");
  }
  const connPct =
    input.connections != null && input.maxConnections
      ? (input.connections / input.maxConnections) * 100
      : 0;
  const latencyStatus = evaluateThreshold(input.latencyMs, { warning: 300, critical: 1500 });
  const connStatus = evaluateThreshold(connPct, { warning: 80, critical: 95 });
  const status: MetricStatus =
    latencyStatus === "critical" || connStatus === "critical"
      ? "critical"
      : latencyStatus === "warning" || connStatus === "warning"
        ? "warning"
        : "ok";
  return signal(
    "database",
    status,
    `${Math.round(input.latencyMs)} ms, ${Math.round(connPct)}% connections`,
    "300ms / 80% warning; 1500ms / 95% critical",
    input.latencyMs,
  );
}
