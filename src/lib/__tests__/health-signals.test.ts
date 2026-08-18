import { describe, expect, it } from "vitest";
import {
  MONITOR_SIGNAL_IDS,
  SUGGESTED_ACTIONS,
  evaluateAvailability,
  evaluateDatabase,
  evaluateHttp5xx,
  evaluateResponseTime,
  evaluateSpike,
  evaluateVercelUsage,
  signalStatusRequiresAction,
} from "@/lib/health/signals";

describe("suggested actions", () => {
  it("has a non-empty action for every signal id", () => {
    for (const id of MONITOR_SIGNAL_IDS) {
      expect(SUGGESTED_ACTIONS[id].length).toBeGreaterThan(10);
    }
  });
});

describe("evaluateAvailability", () => {
  it("warns on a single failed check and is critical after two consecutive failures", () => {
    expect(evaluateAvailability({ ok: false, consecutiveFailures: 1 }).status).toBe("warning");
    expect(evaluateAvailability({ ok: false, consecutiveFailures: 2 }).status).toBe("critical");
    expect(evaluateAvailability({ ok: true, consecutiveFailures: 0 }).status).toBe("ok");
  });
});

describe("evaluateResponseTime", () => {
  it("warns above 3s and is critical above 5s using the slower of homepage and health", () => {
    expect(evaluateResponseTime({ homeMs: 2000, healthMs: 2000 }).status).toBe("ok");
    expect(evaluateResponseTime({ homeMs: 3500, healthMs: 1000 }).status).toBe("warning");
    expect(evaluateResponseTime({ homeMs: 1000, healthMs: 5100 }).status).toBe("critical");
  });
});

describe("evaluateHttp5xx", () => {
  it("warns above 2% and is critical above 5%", () => {
    expect(evaluateHttp5xx({ fiveXx: 1, total: 100 }).status).toBe("ok");
    expect(evaluateHttp5xx({ fiveXx: 3, total: 100 }).status).toBe("warning");
    expect(evaluateHttp5xx({ fiveXx: 6, total: 100 }).status).toBe("critical");
  });

  it("is ok when there is no traffic", () => {
    expect(evaluateHttp5xx({ fiveXx: 0, total: 0 }).status).toBe("ok");
  });
});

describe("evaluateSpike", () => {
  it("skips when baseline is under 20", () => {
    expect(evaluateSpike({ current: 1000, baseline: 19 }).status).toBe("ok");
  });

  it("warns at 3x and is critical at 5x", () => {
    expect(evaluateSpike({ current: 59, baseline: 20 }).status).toBe("ok");
    expect(evaluateSpike({ current: 60, baseline: 20 }).status).toBe("warning");
    expect(evaluateSpike({ current: 100, baseline: 20 }).status).toBe("critical");
  });
});

describe("evaluateVercelUsage", () => {
  it("is ok when the API is not configured", () => {
    const signal = evaluateVercelUsage({ configured: false, percent: null });
    expect(signal.status).toBe("ok");
    expect(signal.value).toBe("usage API not configured");
  });

  it("warns at 80% and is critical at 95%", () => {
    expect(evaluateVercelUsage({ configured: true, percent: 80 }).status).toBe("warning");
    expect(evaluateVercelUsage({ configured: true, percent: 95 }).status).toBe("critical");
  });
});

describe("evaluateDatabase", () => {
  it("is critical when unreachable", () => {
    expect(
      evaluateDatabase({
        ok: false,
        latencyMs: 50,
        connections: 1,
        maxConnections: 100,
      }).status,
    ).toBe("critical");
  });

  it("warns on latency 300ms or connections 80%", () => {
    expect(
      evaluateDatabase({
        ok: true,
        latencyMs: 300,
        connections: 10,
        maxConnections: 100,
      }).status,
    ).toBe("warning");
    expect(
      evaluateDatabase({
        ok: true,
        latencyMs: 50,
        connections: 80,
        maxConnections: 100,
      }).status,
    ).toBe("warning");
  });

  it("is critical on latency 1500ms or connections 95%", () => {
    expect(
      evaluateDatabase({
        ok: true,
        latencyMs: 1500,
        connections: 10,
        maxConnections: 100,
      }).status,
    ).toBe("critical");
    expect(
      evaluateDatabase({
        ok: true,
        latencyMs: 50,
        connections: 95,
        maxConnections: 100,
      }).status,
    ).toBe("critical");
  });
});

describe("signalStatusRequiresAction", () => {
  it("is true only for warning and critical", () => {
    expect(signalStatusRequiresAction("ok")).toBe(false);
    expect(signalStatusRequiresAction("warning")).toBe(true);
    expect(signalStatusRequiresAction("critical")).toBe(true);
  });
});
