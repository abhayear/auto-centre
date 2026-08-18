import { describe, expect, it } from "vitest";
import { planAlertUpdates, type OpenAlertState } from "@/lib/health/alert-policy";
import type { MonitorSignal } from "@/lib/health/signals";

const now = new Date("2026-08-18T06:00:00.000Z");

function sig(id: MonitorSignal["id"], status: MonitorSignal["status"]): MonitorSignal {
  return {
    id,
    label: id,
    value: "x",
    threshold: "t",
    status,
    suggestedAction: status === "ok" ? "No action required." : "Do the thing.",
  };
}

describe("planAlertUpdates", () => {
  it("emails a new warning once", () => {
    const plan = planAlertUpdates({
      now,
      digest: false,
      signals: [sig("http_5xx", "warning")],
      openAlerts: [],
    });
    expect(plan.shouldEmail).toBe(true);
    expect(plan.emailItems.map((i) => i.kind)).toEqual(["new"]);
  });

  it("does not email the same open warning within 45 minutes", () => {
    const open: OpenAlertState[] = [
      {
        signal: "http_5xx",
        severity: "warning",
        state: "open",
        lastSentAt: new Date(now.getTime() - 10 * 60 * 1000).toISOString(),
      },
    ];
    const plan = planAlertUpdates({
      now,
      digest: false,
      signals: [sig("http_5xx", "warning")],
      openAlerts: open,
    });
    expect(plan.shouldEmail).toBe(false);
    expect(plan.emailItems).toEqual([]);
  });

  it("emails immediately on severity upgrade", () => {
    const open: OpenAlertState[] = [
      {
        signal: "http_5xx",
        severity: "warning",
        state: "open",
        lastSentAt: new Date(now.getTime() - 5 * 60 * 1000).toISOString(),
      },
    ];
    const plan = planAlertUpdates({
      now,
      digest: false,
      signals: [sig("http_5xx", "critical")],
      openAlerts: open,
    });
    expect(plan.shouldEmail).toBe(true);
    expect(plan.emailItems[0]?.kind).toBe("upgrade");
  });

  it("emails recovery when a signal returns to ok", () => {
    const open: OpenAlertState[] = [
      {
        signal: "http_5xx",
        severity: "warning",
        state: "open",
        lastSentAt: now.toISOString(),
      },
    ];
    const plan = planAlertUpdates({
      now,
      digest: false,
      signals: [sig("http_5xx", "ok")],
      openAlerts: open,
    });
    expect(plan.shouldEmail).toBe(true);
    expect(plan.emailItems[0]?.kind).toBe("recovered");
  });

  it("digest flag forces email even when all ok", () => {
    const plan = planAlertUpdates({
      now,
      digest: true,
      signals: [sig("availability", "ok")],
      openAlerts: [],
    });
    expect(plan.shouldEmail).toBe(true);
    expect(plan.emailItems[0]?.kind).toBe("digest");
  });
});
