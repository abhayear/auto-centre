import {
  signalStatusRequiresAction,
  type MonitorSignal,
  type MonitorSignalId,
} from "@/lib/health/signals";
import type { MetricStatus } from "@/lib/system-health";

const DEDUPE_MS = 45 * 60 * 1000;

export type OpenAlertState = {
  signal: MonitorSignalId;
  severity: Exclude<MetricStatus, "ok">;
  state: "open" | "recovered";
  lastSentAt: string | null;
};

export type AlertEmailItem = {
  kind: "new" | "upgrade" | "recovered" | "digest";
  signal: MonitorSignal;
};

export type AlertPlan = {
  shouldEmail: boolean;
  emailItems: AlertEmailItem[];
  openAfter: MonitorSignalId[];
  recover: MonitorSignalId[];
  upgrades: MonitorSignalId[];
};

export function planAlertUpdates(input: {
  now: Date;
  digest: boolean;
  signals: MonitorSignal[];
  openAlerts: OpenAlertState[];
}): AlertPlan {
  const openBySignal = new Map(
    input.openAlerts.filter((a) => a.state === "open").map((a) => [a.signal, a]),
  );
  const emailItems: AlertEmailItem[] = [];
  const openAfter: MonitorSignalId[] = [];
  const recover: MonitorSignalId[] = [];
  const upgrades: MonitorSignalId[] = [];

  for (const signal of input.signals) {
    const existing = openBySignal.get(signal.id);
    if (signalStatusRequiresAction(signal.status)) {
      openAfter.push(signal.id);
      if (!existing) {
        emailItems.push({ kind: "new", signal });
        continue;
      }
      if (existing.severity === "warning" && signal.status === "critical") {
        upgrades.push(signal.id);
        emailItems.push({ kind: "upgrade", signal });
        continue;
      }
      const lastSent = existing.lastSentAt ? new Date(existing.lastSentAt).getTime() : 0;
      if (input.now.getTime() - lastSent >= DEDUPE_MS) {
        emailItems.push({ kind: "new", signal });
      }
      continue;
    }
    if (existing) {
      recover.push(signal.id);
      emailItems.push({ kind: "recovered", signal });
    }
  }

  if (input.digest) {
    return {
      shouldEmail: true,
      emailItems:
        emailItems.length > 0
          ? emailItems
          : input.signals.map((signal) => ({ kind: "digest" as const, signal })),
      openAfter,
      recover,
      upgrades,
    };
  }

  return {
    shouldEmail: emailItems.length > 0,
    emailItems,
    openAfter,
    recover,
    upgrades,
  };
}
