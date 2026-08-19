import { prisma as defaultPrisma } from "@/lib/prisma";
import { planAlertUpdates, type OpenAlertState } from "@/lib/health/alert-policy";
import { buildAlertEmail } from "@/lib/health/alert-email";
import {
  fetchVercelUsagePercent,
  pingUrl,
  readDatabaseConnections,
  type PingResult,
} from "@/lib/health/collectors";
import {
  COLLECTOR_FAILED_ACTION,
  evaluateApiErrorSpike,
  evaluateAvailability,
  evaluateDatabase,
  evaluateFunctionFailureSpike,
  evaluateHttp5xx,
  evaluateResponseTime,
  evaluateSpike,
  evaluateVercelUsage,
  type MonitorSignal,
  type MonitorSignalId,
} from "@/lib/health/signals";
import { collectSystemHealthReport } from "@/lib/system-health-report";
import {
  buildRecommendations,
  worstStatus,
  type HealthRecommendation,
  type MetricStatus,
  type WebVitalSummary,
} from "@/lib/system-health";
import { sendHealthAlertEmail } from "@/lib/health/send-smtp";

const COLLECTOR_FAILED_DETAIL = "collector failed, retry next run";
const MINUTE_MS = 60_000;
const DAY_MS = 24 * 60 * MINUTE_MS;

type Source = "github-actions" | "vercel-cron" | "manual";

export type HealthCheckFacts = {
  availabilityOk: boolean;
  consecutiveFailures: number;
  homeMs: number | null;
  healthMs: number | null;
  http5xx: number;
  httpTotal: number;
  apiErrorsCurrent: number;
  apiErrorsPrevious: number;
  functionFailuresCurrent: number;
  functionFailuresPrevious: number;
  visitsLastHour: number;
  visitsSameHourMedian: number;
  vercelConfigured: boolean;
  vercelPercent: number | null;
  databaseOk: boolean;
  databaseLatencyMs: number;
  databaseConnections: number | null;
  databaseMaxConnections: number | null;
  collectorFailures: MonitorSignalId[];
};

type Bucket = {
  minute: Date;
  routeGroup: string;
  statusClass: string;
  count: number;
};

type StoredAlert = {
  id: string;
  signal: string;
  severity: string;
  state: string;
  lastSentAt: Date | null;
};

type Report = {
  overallStatus: MetricStatus;
  environment: unknown;
  vitals: Array<{ id: string; value?: string; numericValue?: number; status: MetricStatus }>;
  webVitals: WebVitalSummary[];
  recommendations: HealthRecommendation[];
};

type QueryRaw = (query: TemplateStringsArray, ...values: unknown[]) => Promise<unknown>;
type Email = ReturnType<typeof buildAlertEmail>;
type EmailResult = { sent: boolean; skipped?: string };
type PreviousSnapshot = {
  payload?: { facts?: { availabilityOk?: boolean }; availabilityOk?: boolean };
};

type HealthCheckPrisma = {
  healthSnapshot: {
    findFirst(args: unknown): Promise<unknown>;
    create(args: unknown): Promise<unknown>;
    deleteMany(args: unknown): Promise<unknown>;
  };
  healthMinuteBucket: {
    findMany(args: unknown): Promise<Bucket[]>;
    deleteMany(args: unknown): Promise<unknown>;
  };
  siteVisit: {
    count(args: unknown): Promise<number>;
  };
  healthAlert: {
    findMany(args: unknown): Promise<StoredAlert[]>;
    upsert(args: unknown): Promise<{ id: string }>;
    update(args: unknown): Promise<unknown>;
  };
};

export type HealthCheckDependencies = {
  prisma: HealthCheckPrisma;
  env: Record<string, string | undefined>;
  ping: (url: string, timeoutMs: number, fetchFn: typeof fetch) => Promise<PingResult>;
  fetchFn: typeof fetch;
  queryRaw: QueryRaw;
  collectReport: () => Promise<Report>;
  readConnections: typeof readDatabaseConnections;
  fetchVercelUsage: typeof fetchVercelUsagePercent;
  sendHealthEmail?: (email: Email) => Promise<EmailResult>;
};

function collectorFailed(signal: MonitorSignal): MonitorSignal {
  return {
    ...signal,
    status: "warning",
    suggestedAction: COLLECTOR_FAILED_ACTION,
    detail: COLLECTOR_FAILED_DETAIL,
  };
}

export function buildSignalsFromFacts(facts: HealthCheckFacts): MonitorSignal[] {
  const failed = new Set(facts.collectorFailures);
  const signals: MonitorSignal[] = [
    evaluateAvailability({
      ok: facts.availabilityOk,
      consecutiveFailures: facts.consecutiveFailures,
    }),
    evaluateResponseTime({ homeMs: facts.homeMs, healthMs: facts.healthMs }),
    evaluateHttp5xx({ fiveXx: facts.http5xx, total: facts.httpTotal }),
    evaluateApiErrorSpike({
      current: facts.apiErrorsCurrent,
      baseline: facts.apiErrorsPrevious,
    }),
    evaluateFunctionFailureSpike({
      current: facts.functionFailuresCurrent,
      baseline: facts.functionFailuresPrevious,
    }),
    evaluateSpike({
      current: facts.visitsLastHour,
      baseline: facts.visitsSameHourMedian,
    }),
    evaluateVercelUsage({
      configured: facts.vercelConfigured,
      percent: facts.vercelPercent,
    }),
    evaluateDatabase({
      ok: facts.databaseOk,
      latencyMs: facts.databaseLatencyMs,
      connections: facts.databaseConnections,
      maxConnections: facts.databaseMaxConnections,
    }),
  ];

  return signals.map((signal) =>
    signal.id !== "database" && failed.has(signal.id) ? collectorFailed(signal) : signal,
  );
}

function numberFromVital(report: Report, id: string, fallback = 0): number {
  return report.vitals.find((vital) => vital.id === id)?.numericValue ?? fallback;
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? ((sorted[middle - 1] ?? 0) + (sorted[middle] ?? 0)) / 2
    : (sorted[middle] ?? 0);
}

function countBuckets(
  buckets: Bucket[],
  input: {
    from: Date;
    to: Date;
    route?: (routeGroup: string) => boolean;
    status?: (statusClass: string) => boolean;
  },
): number {
  return buckets.reduce((total, bucket) => {
    const minute = new Date(bucket.minute).getTime();
    if (minute < input.from.getTime() || minute >= input.to.getTime()) return total;
    if (input.route && !input.route(bucket.routeGroup)) return total;
    if (input.status && !input.status(bucket.statusClass)) return total;
    return total + bucket.count;
  }, 0);
}

function defaultDependencies(): HealthCheckDependencies {
  return {
    prisma: defaultPrisma as unknown as HealthCheckPrisma,
    env: process.env,
    ping: pingUrl,
    fetchFn: fetch,
    queryRaw: defaultPrisma.$queryRaw.bind(defaultPrisma) as QueryRaw,
    collectReport: collectSystemHealthReport,
    readConnections: readDatabaseConnections,
    fetchVercelUsage: fetchVercelUsagePercent,
    sendHealthEmail: (email) => sendHealthAlertEmail(email),
  };
}

export async function runHealthCheck(
  input: { source: Source; digest: boolean; now?: Date },
  dependencyOverrides: Partial<HealthCheckDependencies> = {},
): Promise<{
  overallStatus: MetricStatus;
  signals: MonitorSignal[];
  emailSkipped: string | null;
  emailed: boolean;
}> {
  const dependencies = { ...defaultDependencies(), ...dependencyOverrides };
  const now = input.now ?? new Date();
  const siteUrl = (dependencies.env.NEXTAUTH_URL ?? "https://autogalaxy.in").replace(/\/+$/, "");
  const collectorFailures = new Set<MonitorSignalId>();
  let persistenceFailed = false;

  let home: PingResult = { ok: false, ms: 0, status: null };
  let health: PingResult = { ok: false, ms: 0, status: null };
  try {
    [home, health] = await Promise.all([
      dependencies.ping(`${siteUrl}/`, 5_000, dependencies.fetchFn),
      dependencies.ping(`${siteUrl}/api/health`, 5_000, dependencies.fetchFn),
    ]);
  } catch {
    collectorFailures.add("availability");
    collectorFailures.add("response_time");
  }

  let previousSnapshot: PreviousSnapshot | null = null;
  try {
    previousSnapshot = (await dependencies.prisma.healthSnapshot.findFirst({
      orderBy: { createdAt: "desc" },
      select: { payload: true },
    })) as PreviousSnapshot | null;
  } catch {
    persistenceFailed = true;
  }
  const previousAvailability =
    previousSnapshot?.payload?.facts?.availabilityOk ??
    previousSnapshot?.payload?.availabilityOk ??
    true;
  const availabilityOk = home.ok && health.ok;
  const consecutiveFailures = availabilityOk ? 0 : previousAvailability ? 1 : 2;

  const previousHourStart = new Date(now.getTime() - 120 * MINUTE_MS);
  const currentHourStart = new Date(now.getTime() - 60 * MINUTE_MS);
  const fifteenMinutesAgo = new Date(now.getTime() - 15 * MINUTE_MS);
  let buckets: Bucket[] = [];
  try {
    buckets = await dependencies.prisma.healthMinuteBucket.findMany({
      where: { minute: { gte: previousHourStart, lt: now } },
      select: { minute: true, routeGroup: true, statusClass: true, count: true },
    });
  } catch {
    persistenceFailed = true;
    collectorFailures.add("http_5xx");
    collectorFailures.add("api_errors");
    collectorFailures.add("function_failures");
  }

  const apiRoute = (routeGroup: string) => routeGroup.startsWith("/api/");
  const errors = (statusClass: string) => statusClass === "4xx" || statusClass === "5xx";
  const fiveXx = (statusClass: string) => statusClass === "5xx";
  const http5xx = countBuckets(buckets, {
    from: fifteenMinutesAgo,
    to: now,
    status: fiveXx,
  });
  let html2xx = 0;
  try {
    html2xx = await dependencies.prisma.siteVisit.count({
      where: { visitedAt: { gte: fifteenMinutesAgo, lt: now } },
    });
  } catch {
    persistenceFailed = true;
    collectorFailures.add("http_5xx");
  }
  const httpTotal =
    countBuckets(buckets, { from: fifteenMinutesAgo, to: now }) + html2xx;
  const apiErrorsCurrent = countBuckets(buckets, {
    from: currentHourStart,
    to: now,
    route: apiRoute,
    status: errors,
  });
  const apiErrorsPrevious = countBuckets(buckets, {
    from: previousHourStart,
    to: currentHourStart,
    route: apiRoute,
    status: errors,
  });
  const functionFailuresCurrent = countBuckets(buckets, {
    from: currentHourStart,
    to: now,
    route: apiRoute,
    status: fiveXx,
  });
  const functionFailuresPrevious = countBuckets(buckets, {
    from: previousHourStart,
    to: currentHourStart,
    route: apiRoute,
    status: fiveXx,
  });

  let report: Report;
  try {
    report = await dependencies.collectReport();
  } catch {
    report = {
      overallStatus: "critical",
      environment: {
        nodeVersion: process.version,
        vercelRegion: dependencies.env.VERCEL_REGION ?? null,
        vercelEnv: dependencies.env.VERCEL_ENV ?? null,
        siteUrl,
      },
      vitals: [{ id: "db-latency", value: "Unreachable", status: "critical" }],
      webVitals: [],
      recommendations: [],
    };
  }

  const connections = await dependencies.readConnections(dependencies.queryRaw);

  const vercel = await dependencies.fetchVercelUsage(dependencies.env, dependencies.fetchFn);
  if (vercel.error) collectorFailures.add("vercel_usage");

  let visitsSameHourMedian = 0;
  try {
    const rows = await dependencies.queryRaw`
      SELECT date_trunc('hour', "visitedAt") AS hour, COUNT(*)::int AS count
      FROM "SiteVisit"
      WHERE "visitedAt" >= ${new Date(now.getTime() - 7 * DAY_MS)}
        AND "visitedAt" < ${now}
        AND EXTRACT(HOUR FROM "visitedAt") = ${now.getUTCHours()}
      GROUP BY 1
      ORDER BY 1
    `;
    const populatedCounts = Array.isArray(rows)
      ? rows
          .map((row) => Number((row as { count?: unknown }).count))
          .filter(Number.isFinite)
          .slice(-7)
      : [];
    const sevenDayCounts = [
      ...populatedCounts,
      ...Array(Math.max(0, 7 - populatedCounts.length)).fill(0),
    ];
    visitsSameHourMedian = median(sevenDayCounts);
  } catch {
    visitsSameHourMedian = 0;
  }

  const dbLatencyVital = report.vitals.find((vital) => vital.id === "db-latency");
  const databaseOk =
    dbLatencyVital != null &&
    dbLatencyVital.value !== "Unreachable" &&
    (dbLatencyVital.value != null || dbLatencyVital.status !== "critical") &&
    connections.connections != null;
  const facts: HealthCheckFacts = {
    availabilityOk,
    consecutiveFailures,
    homeMs: home.ms,
    healthMs: health.ms,
    http5xx,
    httpTotal,
    apiErrorsCurrent,
    apiErrorsPrevious,
    functionFailuresCurrent,
    functionFailuresPrevious,
    visitsLastHour: numberFromVital(report, "traffic-hour"),
    visitsSameHourMedian,
    vercelConfigured: vercel.configured,
    vercelPercent: vercel.percent,
    databaseOk: databaseOk && !persistenceFailed,
    databaseLatencyMs: dbLatencyVital?.numericValue ?? 0,
    databaseConnections: connections.connections,
    databaseMaxConnections: connections.maxConnections,
    collectorFailures: [...collectorFailures],
  };
  let signals = buildSignalsFromFacts(facts);
  const recommendations = buildRecommendations({
    dbLatencyMs: facts.databaseLatencyMs,
    visitsLastHour: facts.visitsLastHour,
    visitsToday: numberFromVital(report, "traffic-today"),
    siteVisitRows: numberFromVital(report, "analytics-rows"),
    webVitals: report.webVitals,
    databaseOk: facts.databaseOk,
  });
  let overallStatus = worstStatus([
    report.overallStatus,
    ...signals.map((signal) => signal.status),
  ]);
  let replanAlerts: (() => void) | null = null;

  const markPersistenceFailure = () => {
    persistenceFailed = true;
    facts.databaseOk = false;
    signals = signals.map((signal) =>
      signal.id === "database"
        ? evaluateDatabase({
            ok: false,
            latencyMs: facts.databaseLatencyMs,
            connections: facts.databaseConnections,
            maxConnections: facts.databaseMaxConnections,
          })
        : signal,
    );
    overallStatus = worstStatus([
      report.overallStatus,
      ...signals.map((signal) => signal.status),
    ]);
    replanAlerts?.();
  };
  let storedAlerts: StoredAlert[] = [];
  try {
    storedAlerts = await dependencies.prisma.healthAlert.findMany({
      where: { state: "open" },
      orderBy: { openedAt: "asc" },
    });
  } catch {
    markPersistenceFailure();
  }
  const openAlerts: OpenAlertState[] = storedAlerts
    .filter(
      (alert): alert is StoredAlert & { signal: MonitorSignalId; severity: "warning" | "critical" } =>
        signals.some((signal) => signal.id === alert.signal) &&
        (alert.severity === "warning" || alert.severity === "critical"),
    )
    .map((alert) => ({
      signal: alert.signal,
      severity: alert.severity,
      state: "open",
      lastSentAt: alert.lastSentAt?.toISOString() ?? null,
    }));
  let alertPlan = planAlertUpdates({
    now,
    digest: input.digest,
    signals,
    openAlerts,
  });

  let emailSkipped: string | null =
    alertPlan.shouldEmail && (!dependencies.env.SMTP_USER || !dependencies.env.SMTP_PASS)
      ? "smtp_not_configured"
      : null;
  replanAlerts = () => {
    alertPlan = planAlertUpdates({
      now,
      digest: input.digest,
      signals,
      openAlerts,
    });
    emailSkipped =
      alertPlan.shouldEmail && (!dependencies.env.SMTP_USER || !dependencies.env.SMTP_PASS)
        ? "smtp_not_configured"
        : null;
  };
  try {
    await dependencies.prisma.healthSnapshot.create({
      data: {
        createdAt: now,
        source: input.source,
        overallStatus,
        payload: {
          signals,
          recommendations,
          environment: report.environment,
          facts,
          emailSkipped,
        },
      },
    });
  } catch {
    markPersistenceFailure();
  }

  const existingBySignal = new Map(storedAlerts.map((alert) => [alert.signal, alert]));
  const openIds = new Map<MonitorSignalId, string>();
  for (const signal of signals) {
    if (signal.status === "ok") continue;
    const existing = existingBySignal.get(signal.id);
    if (existing) {
      try {
        await dependencies.prisma.healthAlert.update({
          where: { id: existing.id },
          data: {
            severity: signal.status,
            lastSeenAt: now,
            title: signal.label,
            detail: signal.detail ?? signal.value,
            suggestedAction: signal.suggestedAction,
          },
        });
        openIds.set(signal.id, existing.id);
      } catch {
        markPersistenceFailure();
      }
    } else {
      const fingerprint = `open:${signal.id}`;
      try {
        const created = await dependencies.prisma.healthAlert.upsert({
          where: { fingerprint },
          update: {
            severity: signal.status,
            lastSeenAt: now,
            title: signal.label,
            detail: signal.detail ?? signal.value,
            suggestedAction: signal.suggestedAction,
          },
          create: {
            signal: signal.id,
            severity: signal.status,
            state: "open",
            openedAt: now,
            lastSeenAt: now,
            title: signal.label,
            detail: signal.detail ?? signal.value,
            suggestedAction: signal.suggestedAction,
            fingerprint,
          },
        });
        openIds.set(signal.id, created.id);
      } catch {
        markPersistenceFailure();
      }
    }
  }
  for (const signalId of [...alertPlan.recover]) {
    if (!alertPlan.recover.includes(signalId)) continue;
    const existing = existingBySignal.get(signalId);
    if (!existing) continue;
    try {
      await dependencies.prisma.healthAlert.update({
        where: { id: existing.id },
        data: {
          state: "recovered",
          recoveredAt: now,
          lastSeenAt: now,
          fingerprint: `recovered:${existing.id}`,
        },
      });
    } catch {
      markPersistenceFailure();
    }
  }

  await Promise.all([
    dependencies.prisma.healthMinuteBucket
      .deleteMany({
        where: { minute: { lt: new Date(now.getTime() - 8 * DAY_MS) } },
      })
      .catch(markPersistenceFailure),
    dependencies.prisma.healthSnapshot
      .deleteMany({
        where: { createdAt: { lt: new Date(now.getTime() - 30 * DAY_MS) } },
      })
      .catch(markPersistenceFailure),
  ]);

  let emailed = false;
  if (alertPlan.shouldEmail && emailSkipped == null) {
    if (!dependencies.sendHealthEmail) {
      emailSkipped = "smtp_not_configured";
    } else {
      try {
        const result = await dependencies.sendHealthEmail(
          buildAlertEmail({
            items: alertPlan.emailItems,
            recommendations,
            digest: input.digest,
            overallStatus,
            siteUrl,
          }),
        );
        emailed = result.sent;
        emailSkipped = result.skipped ?? (result.sent ? null : "smtp_error");
      } catch {
        emailSkipped = "smtp_error";
      }
    }
  }

  if (emailed) {
    for (const item of alertPlan.emailItems) {
      if (item.signal.status === "ok") continue;
      const id = openIds.get(item.signal.id);
      if (!id) continue;
      try {
        await dependencies.prisma.healthAlert.update({
          where: { id },
          data: { lastSentAt: now },
        });
      } catch {
        markPersistenceFailure();
      }
    }
  }

  return { overallStatus, signals, emailSkipped, emailed };
}
