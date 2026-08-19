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
    const snapshotCreate = vi.fn().mockResolvedValue({ id: "snapshot-1" });
    const fakePrisma = {
      healthSnapshot: {
        findFirst: vi.fn().mockResolvedValue(null),
        create: snapshotCreate,
        deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
      },
      healthMinuteBucket: {
        findMany: vi.fn().mockResolvedValue([]),
        deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
      },
      healthAlert: {
        findMany: vi.fn().mockResolvedValue([]),
        create: vi.fn().mockResolvedValue({ id: "alert-1" }),
        update: vi.fn().mockResolvedValue({}),
      },
    };
    const sendHealthEmail = vi.fn();

    const result = await runHealthCheck(
      {
        source: "manual",
        digest: true,
        now: new Date("2026-08-19T03:30:00.000Z"),
      },
      {
        prisma: fakePrisma,
        env: {},
        ping: vi.fn().mockResolvedValue({ ok: true, ms: 100, status: 200 }),
        queryRaw: vi.fn().mockResolvedValue([]),
        collectReport: vi.fn().mockResolvedValue({
          overallStatus: "ok",
          environment: { nodeVersion: "test", vercelRegion: null, vercelEnv: null, siteUrl: null },
          vitals: [
            { id: "db-latency", numericValue: 50, status: "ok" },
            { id: "traffic-hour", numericValue: 10, status: "ok" },
            { id: "traffic-today", numericValue: 10, status: "ok" },
            { id: "analytics-rows", numericValue: 10, status: "ok" },
          ],
          webVitals: [],
          recommendations: [
            {
              severity: "ok",
              title: "All vitals within safe limits",
              action: "Keep monitoring.",
            },
          ],
        }),
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
    expect(snapshotCreate).toHaveBeenCalledOnce();
  });
});
