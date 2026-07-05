import { prisma } from "@/lib/prisma";
import { isDatabaseAvailable } from "@/lib/safe-db";
import {
  buildRecommendations,
  formatBytes,
  formatMs,
  summarizeWebVital,
  THRESHOLDS,
  type HourlyTraffic,
  type MetricStatus,
  type VitalMetric,
  worstStatus,
  evaluateThreshold,
} from "@/lib/system-health";

const WEB_VITALS_RETENTION_DAYS = 7;

type DbSizeRow = { size: bigint | number };
type PeakHourRow = { hour: Date; count: bigint | number };
type HourlyRow = { hour: Date; count: bigint | number };

async function measureDatabaseLatency(): Promise<{ ok: boolean; latencyMs: number }> {
  const start = performance.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { ok: true, latencyMs: performance.now() - start };
  } catch {
    return { ok: false, latencyMs: performance.now() - start };
  }
}

async function getDatabaseSizeBytes(): Promise<number | null> {
  try {
    const rows = await prisma.$queryRaw<DbSizeRow[]>`
      SELECT pg_database_size(current_database()) AS size
    `;
    const size = rows[0]?.size;
    return size == null ? null : Number(size);
  } catch {
    return null;
  }
}

async function getPeakHourTraffic(since: Date): Promise<{ hour: string; count: number } | null> {
  try {
    const rows = await prisma.$queryRaw<PeakHourRow[]>`
      SELECT date_trunc('hour', "visitedAt") AS hour, COUNT(*)::int AS count
      FROM "SiteVisit"
      WHERE "visitedAt" >= ${since}
      GROUP BY 1
      ORDER BY 2 DESC
      LIMIT 1
    `;
    const row = rows[0];
    if (!row) return null;
    return {
      hour: new Date(row.hour).toISOString(),
      count: Number(row.count),
    };
  } catch {
    return null;
  }
}

async function getHourlyTraffic(since: Date): Promise<HourlyTraffic[]> {
  try {
    const rows = await prisma.$queryRaw<HourlyRow[]>`
      SELECT date_trunc('hour', "visitedAt") AS hour, COUNT(*)::int AS count
      FROM "SiteVisit"
      WHERE "visitedAt" >= ${since}
      GROUP BY 1
      ORDER BY 1 ASC
    `;
    return rows.map((row) => ({
      hour: new Date(row.hour).toISOString(),
      count: Number(row.count),
    }));
  } catch {
    return [];
  }
}

async function getWebVitalsSummaries() {
  const since = new Date();
  since.setDate(since.getDate() - 1);

  const samples = await prisma.webVitalsSample.findMany({
    where: { createdAt: { gte: since } },
    select: { name: true, value: true },
  });

  const grouped = new Map<string, number[]>();
  for (const sample of samples) {
    const bucket = grouped.get(sample.name) ?? [];
    bucket.push(sample.value);
    grouped.set(sample.name, bucket);
  }

  return ["LCP", "INP", "CLS", "TTFB"]
    .map((name) => summarizeWebVital(name, grouped.get(name) ?? []))
    .filter((item): item is NonNullable<typeof item> => item != null);
}

export async function collectSystemHealthReport() {
  const now = new Date();
  const memory = process.memoryUsage();
  const heapUsedMb = memory.heapUsed / (1024 * 1024);

  const dbAvailable = await isDatabaseAvailable();
  if (!dbAvailable) {
    const vitals: VitalMetric[] = [
      {
        id: "db-latency",
        label: "Database latency",
        value: "Unreachable",
        status: "critical",
        detail: "PostgreSQL offline at localhost:5433",
      },
      {
        id: "heap",
        label: "Server memory (heap)",
        value: `${Math.round(heapUsedMb)} MB`,
        numericValue: heapUsedMb,
        unit: "MB",
        status: evaluateThreshold(heapUsedMb, THRESHOLDS.heapUsedMb),
        detail: "Per serverless function instance",
      },
    ];

    return {
      generatedAt: now.toISOString(),
      overallStatus: "critical" as MetricStatus,
      environment: {
        nodeVersion: process.version,
        vercelRegion: process.env.VERCEL_REGION ?? null,
        vercelEnv: process.env.VERCEL_ENV ?? null,
        siteUrl:
          process.env.NEXTAUTH_URL ??
          (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null),
      },
      vitals,
      webVitals: [],
      hourlyTraffic: [] as HourlyTraffic[],
      peakHour: null,
      recommendations: buildRecommendations({
        dbLatencyMs: 9999,
        visitsLastHour: 0,
        visitsToday: 0,
        siteVisitRows: 0,
        webVitals: [],
        databaseOk: false,
      }),
      cloudLinks: [
        {
          label: "Vercel project dashboard",
          href: "https://vercel.com/dashboard",
          description: "Deployments, bandwidth, function duration, and error logs",
        },
        {
          label: "Neon database console",
          href: "https://console.neon.tech",
          description: "Compute size, connections, storage, and query performance",
        },
      ],
    };
  }

  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);

  const [
    dbCheck,
    dbSizeBytes,
    visitsLastHour,
    visitsToday,
    visitsLast24h,
    siteVisitRows,
    vehicleCount,
    bookingCount,
    webVitals,
    peakHour,
    hourlyTraffic,
  ] = await Promise.all([
    measureDatabaseLatency(),
    getDatabaseSizeBytes(),
    prisma.siteVisit.count({ where: { visitedAt: { gte: oneHourAgo } } }),
    prisma.siteVisit.count({ where: { visitedAt: { gte: startOfToday } } }),
    prisma.siteVisit.count({ where: { visitedAt: { gte: oneDayAgo } } }),
    prisma.siteVisit.count(),
    prisma.vehicle.count(),
    prisma.serviceBooking.count(),
    getWebVitalsSummaries(),
    getPeakHourTraffic(oneDayAgo),
    getHourlyTraffic(oneDayAgo),
  ]);

  const dbStatus: MetricStatus = dbCheck.ok
    ? evaluateThreshold(dbCheck.latencyMs, THRESHOLDS.dbLatencyMs)
    : "critical";

  const vitals: VitalMetric[] = [
    {
      id: "db-latency",
      label: "Database latency",
      value: dbCheck.ok ? formatMs(dbCheck.latencyMs) : "Unreachable",
      numericValue: dbCheck.latencyMs,
      unit: "ms",
      status: dbStatus,
      detail: dbCheck.ok ? "PostgreSQL ping on Neon" : "Connection failed",
    },
    {
      id: "db-size",
      label: "Database size",
      value: dbSizeBytes == null ? "Unknown" : formatBytes(dbSizeBytes),
      numericValue: dbSizeBytes ?? undefined,
      status: "ok",
      detail: "Total Postgres storage used",
    },
    {
      id: "traffic-hour",
      label: "Visits (last hour)",
      value: String(visitsLastHour),
      numericValue: visitsLastHour,
      status: evaluateThreshold(visitsLastHour, THRESHOLDS.visitsPerHour),
      detail: "Public page views recorded",
    },
    {
      id: "traffic-today",
      label: "Visits (today)",
      value: String(visitsToday),
      numericValue: visitsToday,
      status: evaluateThreshold(visitsToday, THRESHOLDS.visitsToday),
    },
    {
      id: "traffic-24h",
      label: "Visits (24h)",
      value: String(visitsLast24h),
      numericValue: visitsLast24h,
      status: "ok",
    },
    {
      id: "peak-hour",
      label: "Peak hour (24h)",
      value: peakHour ? String(peakHour.count) : "—",
      numericValue: peakHour?.count,
      status: peakHour
        ? evaluateThreshold(peakHour.count, THRESHOLDS.visitsPerHour)
        : "ok",
      detail: peakHour
        ? new Date(peakHour.hour).toLocaleString("en-IN", {
            dateStyle: "medium",
            timeStyle: "short",
          })
        : "No traffic yet",
    },
    {
      id: "heap",
      label: "Server memory (heap)",
      value: `${Math.round(heapUsedMb)} MB`,
      numericValue: heapUsedMb,
      unit: "MB",
      status: evaluateThreshold(heapUsedMb, THRESHOLDS.heapUsedMb),
      detail: "Per serverless function instance",
    },
    {
      id: "analytics-rows",
      label: "Analytics rows",
      value: siteVisitRows.toLocaleString("en-IN"),
      numericValue: siteVisitRows,
      status: evaluateThreshold(siteVisitRows, THRESHOLDS.siteVisitRows),
      detail: "SiteVisit table row count",
    },
    {
      id: "vehicles",
      label: "Vehicles in catalog",
      value: String(vehicleCount),
      numericValue: vehicleCount,
      status: "ok",
    },
    {
      id: "bookings",
      label: "Service bookings",
      value: String(bookingCount),
      numericValue: bookingCount,
      status: "ok",
    },
  ];

  for (const vital of webVitals) {
    const displayValue =
      vital.name === "CLS" ? vital.p75.toFixed(3) : formatMs(vital.p75);
    vitals.push({
      id: `web-${vital.name.toLowerCase()}`,
      label: `${vital.name} (p75, 24h)`,
      value: displayValue,
      numericValue: vital.p75,
      status: vital.status,
      detail: `${vital.count} samples`,
    });
  }

  const overallStatus = worstStatus(vitals.map((vital) => vital.status));
  const recommendations = buildRecommendations({
    dbLatencyMs: dbCheck.latencyMs,
    visitsLastHour,
    visitsToday,
    siteVisitRows,
    webVitals,
    databaseOk: dbCheck.ok,
  });

  return {
    generatedAt: now.toISOString(),
    overallStatus,
    environment: {
      nodeVersion: process.version,
      vercelRegion: process.env.VERCEL_REGION ?? null,
      vercelEnv: process.env.VERCEL_ENV ?? null,
      siteUrl:
        process.env.NEXTAUTH_URL ??
        (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null),
    },
    vitals,
    webVitals,
    hourlyTraffic,
    peakHour,
    recommendations,
    cloudLinks: [
      {
        label: "Vercel project dashboard",
        href: "https://vercel.com/dashboard",
        description: "Deployments, bandwidth, function duration, and error logs",
      },
      {
        label: "Neon database console",
        href: "https://console.neon.tech",
        description: "Compute size, connections, storage, and query performance",
      },
    ],
  };
}

export async function recordWebVitalSample(input: {
  name: string;
  value: number;
  rating: string;
  path?: string | null;
}) {
  const sample = await prisma.webVitalsSample.create({
    data: {
      name: input.name,
      value: input.value,
      rating: input.rating,
      path: input.path?.slice(0, 200) ?? null,
    },
  });

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - WEB_VITALS_RETENTION_DAYS);
  void prisma.webVitalsSample
    .deleteMany({ where: { createdAt: { lt: cutoff } } })
    .catch(() => undefined);

  return sample;
}
