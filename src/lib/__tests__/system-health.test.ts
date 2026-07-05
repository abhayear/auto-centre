import { describe, expect, it } from "vitest";
import {
  buildRecommendations,
  evaluateThreshold,
  formatBytes,
  formatMs,
  statusLabel,
  summarizeWebVital,
  worstStatus,
} from "@/lib/system-health";

describe("evaluateThreshold", () => {
  it("flags higher values as worse by default", () => {
    expect(evaluateThreshold(100, { warning: 300, critical: 1500 })).toBe("ok");
    expect(evaluateThreshold(400, { warning: 300, critical: 1500 })).toBe("warning");
    expect(evaluateThreshold(1600, { warning: 300, critical: 1500 })).toBe("critical");
  });
});

describe("worstStatus", () => {
  it("returns the most severe status", () => {
    expect(worstStatus(["ok", "warning", "ok"])).toBe("warning");
    expect(worstStatus(["ok", "critical", "warning"])).toBe("critical");
  });
});

describe("formatters", () => {
  it("formats bytes and milliseconds", () => {
    expect(formatBytes(1536)).toBe("1.5 KB");
    expect(formatMs(450)).toBe("450 ms");
    expect(formatMs(2500)).toBe("2.50 s");
  });
});

describe("summarizeWebVital", () => {
  it("returns null when there are no samples", () => {
    expect(summarizeWebVital("LCP", [])).toBeNull();
  });

  it("computes p75 and status for LCP", () => {
    const summary = summarizeWebVital("LCP", [1200, 1800, 2600, 4200]);
    expect(summary?.count).toBe(4);
    expect(summary?.p75).toBe(4200);
    expect(summary?.status).toBe("critical");
  });
});

describe("buildRecommendations", () => {
  it("returns a healthy message when all vitals are fine", () => {
    const recommendations = buildRecommendations({
      dbLatencyMs: 50,
      visitsLastHour: 10,
      visitsToday: 100,
      siteVisitRows: 1000,
      webVitals: [],
      databaseOk: true,
    });

    expect(recommendations).toHaveLength(1);
    expect(recommendations[0].severity).toBe("ok");
  });

  it("warns when database latency is high", () => {
    const recommendations = buildRecommendations({
      dbLatencyMs: 400,
      visitsLastHour: 10,
      visitsToday: 100,
      siteVisitRows: 1000,
      webVitals: [],
      databaseOk: true,
    });

    expect(recommendations.some((item) => item.title.includes("Database response"))).toBe(true);
  });
});

describe("statusLabel", () => {
  it("maps statuses to labels", () => {
    expect(statusLabel("ok")).toBe("Healthy");
    expect(statusLabel("warning")).toBe("Warning");
    expect(statusLabel("critical")).toBe("Critical");
  });
});
