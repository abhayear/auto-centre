import { describe, expect, it, vi } from "vitest";
import { planAlertUpdates } from "@/lib/health/alert-policy";
import {
  buildSignalsFromFacts,
  runHealthCheck,
  type HealthCheckFacts,
} from "@/lib/health/run-health-check";

function allOkFacts(overrides: Partial<HealthCheckFacts> = {}): HealthCheckFacts {
  return {
    availabilityOk: true,
    consecutiveFailures: 0,
    homeMs: 100,
    healthMs: 120,
    http5xx: 0,
    httpTotal: 100,
    apiErrorsCurrent: 1,
    apiErrorsPrevious: 20,
    functionFailuresCurrent: 0,
    functionFailuresPrevious: 20,
    visitsLastHour: 10,
    visitsSameHourMedian: 20,
    vercelConfigured: false,
    vercelPercent: null,
    databaseOk: true,
    databaseLatencyMs: 50,
    databaseConnections: 2,
    databaseMaxConnections: 100,
    collectorFailures: [],
    ...overrides,
  };
}

function fakePrisma() {
  return {
    healthSnapshot: {
      findFirst: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({ id: "snapshot-1" }),
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
    },
    healthMinuteBucket: {
      findMany: vi.fn().mockResolvedValue([]),
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
    },
    siteVisit: {
      count: vi.fn().mockResolvedValue(0),
    },
    healthAlert: {
      findMany: vi.fn().mockResolvedValue([]),
      create: vi.fn().mockResolvedValue({ id: "alert-1" }),
      upsert: vi.fn().mockResolvedValue({ id: "alert-1" }),
      update: vi.fn().mockResolvedValue({}),
    },
  };
}

function healthyReport(visitsLastHour = 10) {
  return {
    overallStatus: "ok" as const,
    environment: { nodeVersion: "test", vercelRegion: null, vercelEnv: null, siteUrl: null },
    vitals: [
      { id: "db-latency", numericValue: 50, status: "ok" as const },
      { id: "traffic-hour", numericValue: visitsLastHour, status: "ok" as const },
      { id: "traffic-today", numericValue: visitsLastHour, status: "ok" as const },
      { id: "analytics-rows", numericValue: 10, status: "ok" as const },
    ],
    webVitals: [],
    recommendations: [
      {
        severity: "ok" as const,
        title: "All vitals within safe limits",
        action: "Keep monitoring.",
      },
    ],
  };
}

describe("buildSignalsFromFacts", () => {
  it("marks repeated site failure critical without blaming the database", () => {
    const signals = buildSignalsFromFacts(
      allOkFacts({
        availabilityOk: false,
        consecutiveFailures: 2,
      }),
    );

    expect(signals.find((signal) => signal.id === "availability")?.status).toBe("critical");
    expect(signals.find((signal) => signal.id === "database")?.status).toBe("ok");
  });

  it("keeps availability healthy when only the database is unreachable", () => {
    const signals = buildSignalsFromFacts(
      allOkFacts({
        databaseOk: false,
      }),
    );
    const availability = signals.find((signal) => signal.id === "availability");
    const database = signals.find((signal) => signal.id === "database");

    expect(availability?.status).toBe("ok");
    expect(database?.status).toBe("critical");
    expect(availability?.suggestedAction).not.toBe(database?.suggestedAction);
  });

  it("turns an isolated collector failure into a retry warning", () => {
    const signal = buildSignalsFromFacts(
      allOkFacts({ collectorFailures: ["vercel_usage"] }),
    ).find((item) => item.id === "vercel_usage");

    expect(signal).toMatchObject({
      status: "warning",
      suggestedAction: "collector failed, retry next run",
      detail: "collector failed, retry next run",
    });
  });

  it("allows the alert policy to email an all-ok digest", () => {
    const signals = buildSignalsFromFacts(allOkFacts());
    const plan = planAlertUpdates({
      now: new Date("2026-08-19T03:30:00.000Z"),
      digest: true,
      signals,
      openAlerts: [],
    });

    expect(plan.shouldEmail).toBe(true);
    expect(plan.emailItems.every((item) => item.kind === "digest")).toBe(true);
  });
});

describe("runHealthCheck", () => {
  it("persists an all-ok digest and skips email when SMTP is missing", async () => {
    const prisma = fakePrisma();
    const sendHealthEmail = vi.fn();

    const result = await runHealthCheck(
      {
        source: "manual",
        digest: true,
        now: new Date("2026-08-19T03:30:00.000Z"),
      },
      {
        prisma,
        env: {},
        ping: vi.fn().mockResolvedValue({ ok: true, ms: 100, status: 200 }),
        queryRaw: vi.fn().mockResolvedValue([]),
        collectReport: vi.fn().mockResolvedValue(healthyReport()),
        readConnections: vi.fn().mockResolvedValue({
          connections: 2,
          maxConnections: 100,
        }),
        fetchVercelUsage: vi.fn().mockResolvedValue({
          configured: false,
          percent: null,
        }),
        sendHealthEmail,
      },
    );

    expect(result.overallStatus).toBe("ok");
    expect(result.emailSkipped).toBe("smtp_not_configured");
    expect(result.emailed).toBe(false);
    expect(sendHealthEmail).not.toHaveBeenCalled();
    expect(prisma.healthSnapshot.create).toHaveBeenCalledOnce();
  });

  it("keeps a database connection collector outage critical while the site is up", async () => {
    const result = await runHealthCheck(
      {
        source: "manual",
        digest: false,
        now: new Date("2026-08-19T03:30:00.000Z"),
      },
      {
        prisma: fakePrisma(),
        env: {},
        ping: vi.fn().mockResolvedValue({ ok: true, ms: 100, status: 200 }),
        queryRaw: vi.fn().mockResolvedValue([]),
        collectReport: vi.fn().mockResolvedValue(healthyReport()),
        readConnections: vi.fn().mockResolvedValue({
          connections: null,
          maxConnections: null,
          error: "collector failed",
        }),
        fetchVercelUsage: vi.fn().mockResolvedValue({
          configured: false,
          percent: null,
        }),
      },
    );

    expect(result.signals.find((signal) => signal.id === "availability")?.status).toBe("ok");
    expect(result.signals.find((signal) => signal.id === "database")).toMatchObject({
      status: "critical",
      value: "Unreachable",
    });
  });

  it("counts six missing same-hour samples as zero in the traffic median", async () => {
    const result = await runHealthCheck(
      {
        source: "manual",
        digest: false,
        now: new Date("2026-08-19T03:30:00.000Z"),
      },
      {
        prisma: fakePrisma(),
        env: {},
        ping: vi.fn().mockResolvedValue({ ok: true, ms: 100, status: 200 }),
        queryRaw: vi.fn().mockResolvedValue([{ count: 20 }]),
        collectReport: vi.fn().mockResolvedValue(healthyReport(100)),
        readConnections: vi.fn().mockResolvedValue({
          connections: 2,
          maxConnections: 100,
        }),
        fetchVercelUsage: vi.fn().mockResolvedValue({
          configured: false,
          percent: null,
        }),
      },
    );

    expect(result.signals.find((signal) => signal.id === "traffic_spike")).toMatchObject({
      status: "ok",
      detail: "baseline too small",
    });
  });

  it("includes HTML 2xx visits in the HTTP 5xx denominator", async () => {
    const prisma = fakePrisma();
    prisma.healthMinuteBucket.findMany.mockResolvedValue([
      {
        minute: new Date("2026-08-19T03:25:00.000Z"),
        routeGroup: "/api/bookings",
        statusClass: "5xx",
        count: 3,
      },
    ]);
    prisma.siteVisit.count.mockResolvedValue(97);

    const result = await runHealthCheck(
      {
        source: "manual",
        digest: false,
        now: new Date("2026-08-19T03:30:00.000Z"),
      },
      {
        prisma,
        env: {},
        ping: vi.fn().mockResolvedValue({ ok: true, ms: 100, status: 200 }),
        queryRaw: vi.fn().mockResolvedValue([]),
        collectReport: vi.fn().mockResolvedValue(healthyReport()),
        readConnections: vi.fn().mockResolvedValue({
          connections: 2,
          maxConnections: 100,
        }),
        fetchVercelUsage: vi.fn().mockResolvedValue({
          configured: false,
          percent: null,
        }),
      },
    );

    expect(result.signals.find((signal) => signal.id === "http_5xx")).toMatchObject({
      status: "warning",
      numericValue: 3,
    });
  });

  it.each([
    "healthSnapshot.findFirst",
    "healthSnapshot.create",
    "healthSnapshot.deleteMany",
    "healthAlert.findMany",
    "healthAlert.upsert",
    "healthMinuteBucket.deleteMany",
  ])("returns a critical database signal when %s fails", async (operation) => {
    const prisma = fakePrisma();
    const [model, method] = operation.split(".") as [
      keyof typeof prisma,
      "findFirst" | "create" | "deleteMany" | "findMany" | "upsert",
    ];
    const target = prisma[model] as Record<string, ReturnType<typeof vi.fn>>;
    target[method]?.mockRejectedValueOnce(new Error("persistence unavailable"));

    if (method === "upsert") {
      prisma.healthMinuteBucket.findMany.mockResolvedValue([
        {
          minute: new Date("2026-08-19T03:25:00.000Z"),
          routeGroup: "/api/bookings",
          statusClass: "5xx",
          count: 6,
        },
      ]);
    }

    const result = await runHealthCheck(
      {
        source: "manual",
        digest: false,
        now: new Date("2026-08-19T03:30:00.000Z"),
      },
      {
        prisma,
        env: {},
        ping: vi.fn().mockResolvedValue({ ok: true, ms: 100, status: 200 }),
        queryRaw: vi.fn().mockResolvedValue([]),
        collectReport: vi.fn().mockResolvedValue(healthyReport()),
        readConnections: vi.fn().mockResolvedValue({
          connections: 2,
          maxConnections: 100,
        }),
        fetchVercelUsage: vi.fn().mockResolvedValue({
          configured: false,
          percent: null,
        }),
      },
    );

    expect(result.overallStatus).toBe("critical");
    expect(result.signals.find((signal) => signal.id === "database")?.status).toBe("critical");
  });

  it("uses one stable fingerprint when opening the same signal", async () => {
    const prisma = fakePrisma();
    prisma.healthMinuteBucket.findMany.mockResolvedValue([
      {
        minute: new Date("2026-08-19T03:25:00.000Z"),
        routeGroup: "/api/bookings",
        statusClass: "5xx",
        count: 6,
      },
    ]);

    await runHealthCheck(
      {
        source: "manual",
        digest: false,
        now: new Date("2026-08-19T03:30:00.000Z"),
      },
      {
        prisma,
        env: {},
        ping: vi.fn().mockResolvedValue({ ok: true, ms: 100, status: 200 }),
        queryRaw: vi.fn().mockResolvedValue([]),
        collectReport: vi.fn().mockResolvedValue(healthyReport()),
        readConnections: vi.fn().mockResolvedValue({
          connections: 2,
          maxConnections: 100,
        }),
        fetchVercelUsage: vi.fn().mockResolvedValue({
          configured: false,
          percent: null,
        }),
      },
    );

    expect(prisma.healthAlert.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { fingerprint: "open:http_5xx" },
        create: expect.objectContaining({ fingerprint: "open:http_5xx" }),
      }),
    );
  });

  it("returns a critical database signal when an alert update fails", async () => {
    const prisma = fakePrisma();
    prisma.healthAlert.findMany.mockResolvedValue([
      {
        id: "open-availability",
        signal: "availability",
        severity: "warning",
        state: "open",
        lastSentAt: null,
      },
    ]);
    prisma.healthAlert.update.mockRejectedValueOnce(new Error("persistence unavailable"));

    const result = await runHealthCheck(
      {
        source: "manual",
        digest: false,
        now: new Date("2026-08-19T03:30:00.000Z"),
      },
      {
        prisma,
        env: {},
        ping: vi.fn().mockResolvedValue({ ok: true, ms: 100, status: 200 }),
        queryRaw: vi.fn().mockResolvedValue([]),
        collectReport: vi.fn().mockResolvedValue(healthyReport()),
        readConnections: vi.fn().mockResolvedValue({
          connections: 2,
          maxConnections: 100,
        }),
        fetchVercelUsage: vi.fn().mockResolvedValue({
          configured: false,
          percent: null,
        }),
      },
    );

    expect(result.overallStatus).toBe("critical");
    expect(result.signals.find((signal) => signal.id === "database")?.status).toBe("critical");
  });
});
