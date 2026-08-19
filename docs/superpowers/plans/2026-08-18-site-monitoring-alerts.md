# Site Monitoring and Alerting Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Watch https://autogalaxy.in 24/7 and email `mr.abhaysachan@gmail.com` a report with suggested actions when availability, errors, latency, traffic, Vercel usage, or the database breach thresholds; show the same report on Cloud Vitals; notify the Cursor agent via an hourly scheduled check.

**Architecture:** GitHub Actions every 5 minutes is the primary clock (outside Vercel) so a down site can still send mail. When the site is up, the workflow POSTs `/api/ops/health-check`. Vercel cron is backup plus a 09:00 IST digest. Pure functions evaluate signals and email policy; Prisma stores minute buckets, snapshots, and alerts; Cloud Vitals renders the last report.

**Tech Stack:** Next.js 16 App Router, Prisma/PostgreSQL (Neon), Vitest, nodemailer/SMTP, GitHub Actions, Vercel cron, existing Cloud Vitals (`src/lib/system-health.ts`, `collectSystemHealthReport`).

## Global Constraints

- Alert email: `mr.abhaysachan@gmail.com` (env `ALERT_EMAIL`, same default).
- Site: `https://autogalaxy.in` (`NEXTAUTH_URL`).
- Cron auth: `Authorization: Bearer <CRON_SECRET>`; missing/wrong secret → 401.
- SMTP: `SMTP_HOST` default `smtp.gmail.com`, `SMTP_PORT` default `465`, `SMTP_USER`, `SMTP_PASS`; if unset, skip send and set `emailSkipped: "smtp_not_configured"` — never throw out of the job.
- At most one email per health-check run; 45-minute dedupe unless severity rises; digest (`?digest=1`) always emails.
- Spike signals (`api_errors`, `function_failures`, `traffic_spike`) do not fire when baseline count is `< 20`.
- No request bodies, query strings, cookies, IPs, phones, or emails in buckets.
- Middleware/Edge cannot use Prisma; do not import `@/lib/prisma` from `middleware.ts`.
- Middleware cannot see the downstream status code. Record API outcomes with `observeRoute` in Node route handlers; record HTML 2xx volume from existing `SiteVisit` counts; record thrown 5xx via `instrumentation.ts` `onRequestError`.
- Do not add a new admin nav item; extend `/admin/cloud-vitals` only.
- Isolated workflow: `.github/workflows/site-health.yml` must not be added to `ci.yml`.
- Tests: Vitest, no live network. Windows shells: use `;` not `&&`.
- Suggested action text on warning/critical is required and must match the spec table verbatim.

## File map

| File | Responsibility |
|------|----------------|
| `src/lib/health/signals.ts` | Signal ids, thresholds, suggested actions, evaluate functions |
| `src/lib/health/alert-policy.ts` | Open/upgrade/recover/dedupe/digest → `shouldEmail` |
| `src/lib/health/alert-email.ts` | Subject + text/html body from a report |
| `src/lib/health/route-group.ts` | Path → routeGroup (`/` or `/api/bookings`) |
| `src/lib/health/record-bucket.ts` | Prisma upsert for minute buckets |
| `src/lib/health/observe-route.ts` | Wrap App Router handlers; fire-and-forget bucket write |
| `src/lib/health/collectors.ts` | Ping, `pg_stat_activity`, optional Vercel usage (injected fetch) |
| `src/lib/health/run-health-check.ts` | Orchestrate snapshot, alerts, email, retention |
| `src/lib/health/send-smtp.ts` | nodemailer send |
| `src/instrumentation.ts` | `onRequestError` → 5xx bucket |
| `src/app/api/ops/health-check/route.ts` | Cron/GHA entry |
| `src/app/api/system-health/route.ts` | Include last snapshot + open alerts for UI |
| `src/app/admin/(protected)/cloud-vitals/AdminCloudVitalsPage.tsx` | Alerts + signals + snapshot history |
| `prisma/schema.prisma` + migration | `HealthMinuteBucket`, `HealthSnapshot`, `HealthAlert` |
| `scripts/send-health-alert.mjs` | Site-down email from GitHub Actions |
| `.github/workflows/site-health.yml` | 5-minute probe |
| `vercel.json` | Crons |
| `PRODUCTION_SETUP.md` | New env vars |

---

### Task 1: Signal evaluation helpers

**Files:**
- Create: `src/lib/health/signals.ts`
- Test: `src/lib/__tests__/health-signals.test.ts`

**Interfaces:**
- Consumes: `MetricStatus` from `@/lib/system-health`
- Produces: `MONITOR_SIGNAL_IDS`, `MonitorSignalId`, `MonitorSignal`, `SUGGESTED_ACTIONS`, `evaluateAvailability`, `evaluateResponseTime`, `evaluateHttp5xx`, `evaluateSpike`, `evaluateVercelUsage`, `evaluateDatabase`, `signalStatusRequiresAction`

- [ ] **Step 1: Write the failing test**

Create `src/lib/__tests__/health-signals.test.ts`:

```ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/__tests__/health-signals.test.ts`

Expected: FAIL (cannot find `@/lib/health/signals`)

- [ ] **Step 3: Write minimal implementation**

Create `src/lib/health/signals.ts`:

```ts
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
  return { ...row, id: "api_errors", label: LABELS.api_errors, suggestedAction: row.status === "ok" ? "No action required." : SUGGESTED_ACTIONS.api_errors };
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
    suggestedAction: row.status === "ok" ? "No action required." : SUGGESTED_ACTIONS.function_failures,
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/__tests__/health-signals.test.ts`

Expected: PASS (all tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/health/signals.ts src/lib/__tests__/health-signals.test.ts
git commit -m "Add monitoring signal thresholds and suggested actions."
```

---

### Task 2: Alert email policy (dedupe, upgrade, recover, digest)

**Files:**
- Create: `src/lib/health/alert-policy.ts`
- Test: `src/lib/__tests__/health-alert-policy.test.ts`

**Interfaces:**
- Consumes: `MonitorSignal`, `MonitorSignalId`, `signalStatusRequiresAction` from `src/lib/health/signals.ts`
- Produces: `OpenAlertState`, `AlertPlan`, `planAlertUpdates`

- [ ] **Step 1: Write the failing test**

Create `src/lib/__tests__/health-alert-policy.test.ts`:

```ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/__tests__/health-alert-policy.test.ts`

Expected: FAIL (cannot find `@/lib/health/alert-policy`)

- [ ] **Step 3: Write minimal implementation**

Create `src/lib/health/alert-policy.ts`:

```ts
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/__tests__/health-alert-policy.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/health/alert-policy.ts src/lib/__tests__/health-alert-policy.test.ts
git commit -m "Add alert dedupe, upgrade, recovery, and digest policy."
```

---

### Task 3: Email subject and body builder

**Files:**
- Create: `src/lib/health/alert-email.ts`
- Test: `src/lib/__tests__/health-alert-email.test.ts`

**Interfaces:**
- Consumes: `MonitorSignal`, `AlertEmailItem` from Tasks 1–2
- Produces: `buildAlertEmail({ items, digest, overallStatus, siteUrl })` → `{ subject, text, html }`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";
import { buildAlertEmail } from "@/lib/health/alert-email";
import type { MonitorSignal } from "@/lib/health/signals";

const warning: MonitorSignal = {
  id: "availability",
  label: "Site availability",
  value: "Down (1 check)",
  threshold: "2 consecutive failures = critical",
  status: "warning",
  suggestedAction: "Check the latest Vercel deployment and DNS for autogalaxy.in. Confirm `/api/health`.",
};

describe("buildAlertEmail", () => {
  it("uses CRITICAL in the subject when any item is critical", () => {
    const critical = { ...warning, status: "critical" as const, value: "Down (2 checks)" };
    const email = buildAlertEmail({
      items: [{ kind: "new", signal: critical }],
      digest: false,
      overallStatus: "critical",
      siteUrl: "https://autogalaxy.in",
    });
    expect(email.subject).toBe("[Auto Galaxy] CRITICAL: Site availability");
    expect(email.text).toContain("Suggested action");
    expect(email.text).toContain(warning.suggestedAction);
  });

  it("uses the digest subject when digest is true", () => {
    const email = buildAlertEmail({
      items: [{ kind: "digest", signal: { ...warning, status: "ok", suggestedAction: "No action required." } }],
      digest: true,
      overallStatus: "ok",
      siteUrl: "https://autogalaxy.in",
    });
    expect(email.subject).toBe("[Auto Galaxy] Daily health digest");
  });

  it("uses Recovered when all items are recovered", () => {
    const email = buildAlertEmail({
      items: [{ kind: "recovered", signal: { ...warning, status: "ok", suggestedAction: "No action required." } }],
      digest: false,
      overallStatus: "ok",
      siteUrl: "https://autogalaxy.in",
    });
    expect(email.subject).toBe("[Auto Galaxy] Recovered: Site availability");
    expect(email.text).toContain("no further action unless it returns");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/__tests__/health-alert-email.test.ts`

Expected: FAIL (cannot find module)

- [ ] **Step 3: Write minimal implementation**

Create `src/lib/health/alert-email.ts`:

```ts
import type { AlertEmailItem } from "@/lib/health/alert-policy";
import type { MetricStatus } from "@/lib/system-health";

const LINKS = [
  "Cloud Vitals: https://autogalaxy.in/admin/cloud-vitals",
  "Vercel: https://vercel.com/dashboard",
  "Neon: https://console.neon.tech",
].join("\n");

export function buildAlertEmail(input: {
  items: AlertEmailItem[];
  digest: boolean;
  overallStatus: MetricStatus;
  siteUrl: string;
}): { subject: string; text: string; html: string } {
  const first = input.items[0]?.signal;
  const recoveredOnly =
    input.items.length > 0 && input.items.every((item) => item.kind === "recovered");
  const firstCritical = input.items.find((item) => item.signal.status === "critical")?.signal;
  const firstWarning = input.items.find((item) => item.signal.status === "warning")?.signal;

  let subject: string;
  if (input.digest) {
    subject = "[Auto Galaxy] Daily health digest";
  } else if (recoveredOnly && first) {
    subject = `[Auto Galaxy] Recovered: ${first.label}`;
  } else if (firstCritical) {
    subject = `[Auto Galaxy] CRITICAL: ${firstCritical.label}`;
  } else if (firstWarning) {
    subject = `[Auto Galaxy] WARNING: ${firstWarning.label}`;
  } else {
    subject = "[Auto Galaxy] WARNING: health";
  }

  const blocks = input.items.map((item) => {
    const recoveredNote =
      item.kind === "recovered" ? "\nNo further action unless it returns." : "";
    return [
      `${item.signal.label} (${item.kind})`,
      `Status: ${item.signal.status}`,
      `Value: ${item.signal.value}`,
      `Threshold: ${item.signal.threshold}`,
      `Suggested action: ${item.signal.suggestedAction}${recoveredNote}`,
    ].join("\n");
  });

  const text = [
    `Overall: ${input.overallStatus}`,
    `Site: ${input.siteUrl}`,
    "",
    ...blocks,
    "",
    LINKS,
  ].join("\n");

  const html = `<pre style="font-family:sans-serif;white-space:pre-wrap">${text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")}</pre>`;

  return { subject, text, html };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/__tests__/health-alert-email.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/health/alert-email.ts src/lib/__tests__/health-alert-email.test.ts
git commit -m "Add monitoring alert email subject and body builder."
```

---

### Task 4: Prisma models and migration

**Files:**
- Modify: `prisma/schema.prisma` (append after `WebVitalsSample`)
- Create: `prisma/migrations/20260818120000_add_health_monitoring/migration.sql`

**Interfaces:**
- Consumes: none
- Produces: models `HealthMinuteBucket`, `HealthSnapshot`, `HealthAlert` for later Prisma client use

- [ ] **Step 1: Append models to `prisma/schema.prisma`**

```prisma
model HealthMinuteBucket {
  id              String   @id @default(cuid())
  minute          DateTime
  routeGroup      String
  statusClass     String
  count           Int      @default(0)
  totalDurationMs Int      @default(0)

  @@unique([minute, routeGroup, statusClass])
  @@index([minute])
}

model HealthSnapshot {
  id            String   @id @default(cuid())
  createdAt     DateTime @default(now())
  source        String
  overallStatus String
  payload       Json

  @@index([createdAt])
}

model HealthAlert {
  id               String    @id @default(cuid())
  signal           String
  severity         String
  state            String
  openedAt         DateTime  @default(now())
  lastSeenAt       DateTime  @default(now())
  lastSentAt       DateTime?
  recoveredAt      DateTime?
  title            String
  detail           String
  suggestedAction  String
  fingerprint      String

  @@index([signal, state])
  @@index([openedAt])
}
```

- [ ] **Step 2: Add matching SQL migration**

`prisma/migrations/20260818120000_add_health_monitoring/migration.sql` with `CREATE TABLE` for the three models, unique on `(minute, routeGroup, statusClass)`, indexes as above.

- [ ] **Step 3: Generate client locally**

Run: `npx prisma generate`

Expected: Prisma Client generated with the three new models (exit 0)

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/20260818120000_add_health_monitoring/migration.sql
git commit -m "Add health bucket, snapshot, and alert tables."
```

---

### Task 5: Route groups and minute-bucket recorder

**Files:**
- Create: `src/lib/health/route-group.ts`
- Create: `src/lib/health/record-bucket.ts`
- Test: `src/lib/__tests__/health-route-group.test.ts`

**Interfaces:**
- Consumes: Prisma `healthMinuteBucket`
- Produces: `routeGroupFromPath(pathname: string): string`, `statusClassFromStatus(status: number): "2xx" | "4xx" | "5xx" | "other"`, `truncateToMinute(date: Date): Date`, `recordMinuteBucket(input: { path: string; status: number; durationMs: number }): Promise<void>`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";
import { routeGroupFromPath, statusClassFromStatus } from "@/lib/health/route-group";

describe("routeGroupFromPath", () => {
  it("maps pages to / and APIs to the first two segments", () => {
    expect(routeGroupFromPath("/")).toBe("/");
    expect(routeGroupFromPath("/vehicles/abc")).toBe("/");
    expect(routeGroupFromPath("/api/bookings")).toBe("/api/bookings");
    expect(routeGroupFromPath("/api/bookings/xyz")).toBe("/api/bookings");
    expect(routeGroupFromPath("/api/health")).toBe("/api/health");
  });
});

describe("statusClassFromStatus", () => {
  it("buckets 2xx 4xx 5xx", () => {
    expect(statusClassFromStatus(200)).toBe("2xx");
    expect(statusClassFromStatus(404)).toBe("4xx");
    expect(statusClassFromStatus(503)).toBe("5xx");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/__tests__/health-route-group.test.ts`

Expected: FAIL

- [ ] **Step 3: Implement `route-group.ts` and `record-bucket.ts`**

`routeGroupFromPath`: if pathname starts with `/api/`, return `"/api/" + second segment` (ignore extra segments). Else return `"/"`. Ignore `/_next`, `/favicon.ico` by returning empty string `""` (recorder no-ops).

`recordMinuteBucket`: if route group is `""` or path starts with `/api/ops`, return. `upsert` where unique `[minute, routeGroup, statusClass]` incrementing `count` by 1 and `totalDurationMs` by duration. Catch errors and swallow (never throw to the request).

- [ ] **Step 4: Run tests**

Run: `npx vitest run src/lib/__tests__/health-route-group.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/health/route-group.ts src/lib/health/record-bucket.ts src/lib/__tests__/health-route-group.test.ts
git commit -m "Add request route grouping and minute-bucket recording."
```

---

### Task 6: Observe API routes and thrown 5xx

**Files:**
- Create: `src/lib/health/observe-route.ts`
- Create: `src/instrumentation.ts` (or modify if it already exists)
- Modify: every `src/app/api/**/route.ts` **except** `src/app/api/ops/**` and `src/app/api/auth/[...nextauth]/route.ts`

**Interfaces:**
- Consumes: `recordMinuteBucket`
- Produces: `observeRoute(handler)` wrapping App Router methods

- [ ] **Step 1: Implement `observeRoute`**

```ts
import { recordMinuteBucket } from "@/lib/health/record-bucket";

type AppHandler = (req: Request, context: never) => Promise<Response> | Response;

export function observeRoute(handler: AppHandler): AppHandler {
  return async (req, context) => {
    const start = Date.now();
    let status = 500;
    try {
      const res = await handler(req, context);
      status = res.status;
      return res;
    } catch (error) {
      status = 500;
      throw error;
    } finally {
      const path = new URL(req.url).pathname;
      void recordMinuteBucket({ path, status, durationMs: Date.now() - start });
    }
  };
}
```

- [ ] **Step 2: Wrap handlers**

For each exported `GET`/`POST`/`PATCH`/`PUT`/`DELETE` in the API routes listed by glob `src/app/api/**/route.ts` except ops and nextauth:

Rename the function to `getHandler` (or keep inner) and export `export const GET = observeRoute(getHandler)`.

Do this for all public and admin API routes so 4xx/5xx from `NextResponse.json` are counted. Skip `/api/ops/*` to avoid recursion. Skip NextAuth because it has a special export shape — 5xx there still land in `onRequestError`.

- [ ] **Step 3: Add `src/instrumentation.ts`**

```ts
export async function onRequestError() {
  // Next.js calls this for uncaught request errors.
}

export async function register() {
  // no-op; onRequestError is the hook
}
```

Implement `onRequestError(error, request)`: read `request.path` (or URL), `void recordMinuteBucket({ path, status: 500, durationMs: 0 })`. Swallow recorder errors.

- [ ] **Step 4: Run existing unit tests**

Run: `npx vitest run`

Expected: PASS (existing tests plus new ones)

- [ ] **Step 5: Commit**

```bash
git add src/lib/health/observe-route.ts src/instrumentation.ts src/app/api
git commit -m "Record API status codes into health minute buckets."
```

---

### Task 7: Collectors (ping, database connections, Vercel usage)

**Files:**
- Create: `src/lib/health/collectors.ts`
- Test: `src/lib/__tests__/health-collectors.test.ts`

**Interfaces:**
- Consumes: injected `fetchFn` and `queryFn`
- Produces: `pingUrl(url, timeoutMs, fetchFn)`, `parseMaxConnections(raw)`, `maxPercent(quotas)`, `PingResult`

- [ ] **Step 1: Write tests for ping timeout classification and usage percent**

`pingUrl` must abort after 5000ms, return `{ ok: false, ms, status: null }` on throw/timeout, `{ ok: status 200–399, ms, status }` otherwise.

`maxPercent([{ used: 80, limit: 100 }, { used: 10, limit: 100 }])` → `80`.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/__tests__/health-collectors.test.ts`

Expected: FAIL

- [ ] **Step 3: Implement collectors**

```ts
export type PingResult = { ok: boolean; ms: number; status: number | null };

export async function pingUrl(
  url: string,
  timeoutMs: number,
  fetchFn: typeof fetch,
): Promise<PingResult> {
  const start = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetchFn(url, { signal: controller.signal, redirect: "manual" });
    const ms = Date.now() - start;
    return { ok: res.status >= 200 && res.status < 400, ms, status: res.status };
  } catch {
    return { ok: false, ms: Date.now() - start, status: null };
  } finally {
    clearTimeout(timer);
  }
}

export function maxPercent(quotas: { used: number; limit: number }[]): number | null {
  if (quotas.length === 0) return null;
  return Math.max(...quotas.map((q) => (q.limit <= 0 ? 0 : (q.used / q.limit) * 100)));
}
```

Also export `async function fetchVercelUsagePercent(env, fetchFn): Promise<{ configured: boolean; percent: number | null; error?: string }>`. If `VERCEL_API_TOKEN` missing → `{ configured: false, percent: null }`. Else GET `https://api.vercel.com/v1/usage` with `Authorization: Bearer …`. On non-OK or parse failure return `{ configured: true, percent: null, error: "collector failed" }` (caller will attach `COLLECTOR_FAILED_ACTION` as detail, status warning).

Export `async function readDatabaseConnections(queryRaw)` running `SELECT count(*)::int AS count FROM pg_stat_activity` and `SHOW max_connections`. On failure return `{ connections: null, maxConnections: null, error: "collector failed" }`.

- [ ] **Step 4: Run tests**

Run: `npx vitest run src/lib/__tests__/health-collectors.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/health/collectors.ts src/lib/__tests__/health-collectors.test.ts
git commit -m "Add isolated ping, connection, and Vercel usage collectors."
```

---

### Task 8: Health-check orchestrator

**Files:**
- Create: `src/lib/health/run-health-check.ts`
- Test: `src/lib/__tests__/health-run-check.test.ts`

**Interfaces:**
- Consumes: Tasks 1–5 collectors + `collectSystemHealthReport` + Prisma
- Produces: `runHealthCheck(input: { source: "github-actions" | "vercel-cron" | "manual"; digest: boolean; now?: Date }): Promise<{ overallStatus, signals, emailSkipped, emailed }>`

- [ ] **Step 1: Write tests with a fake Prisma/email/ping layer**

Export inner `buildSignalsFromFacts(facts)` (pure) so tests do not need a database:

Facts include consecutive availability failures, ping timings, 15-minute 5xx/total, API 4xx+5xx current vs previous hour, function 5xx current vs previous hour, visits last hour vs 7-day same-hour median, vercel percent, db latency/connections.

Tests:

1. Site-down facts → `availability` warning/critical, not `database` unless db facts also fail.  
2. Site-up, db unreachable → `availability` ok, `database` critical, different suggested actions.  
3. Digest + all ok → `shouldEmail` true via `planAlertUpdates`.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/__tests__/health-run-check.test.ts`

Expected: FAIL

- [ ] **Step 3: Implement `buildSignalsFromFacts` then `runHealthCheck`**

`runHealthCheck` steps:

1. `siteUrl` from `NEXTAUTH_URL` or `https://autogalaxy.in`.  
2. Ping `${siteUrl}/` and `${siteUrl}/api/health` (5s).  
3. Load last snapshot payload’s `availabilityOk` to compute `consecutiveFailures`.  
4. Aggregate buckets: last 15 minutes and previous/current 60 minutes for `/api/*` 4xx+5xx and 5xx.  
5. `collectSystemHealthReport()` for visits and db latency (catch → db facts failed).  
6. `readDatabaseConnections`.  
7. `fetchVercelUsagePercent`.  
8. Median of `SiteVisit` counts for this hour-of-week over last 7 days (raw SQL `date_trunc('hour')`). If query fails, skip traffic spike (baseline 0 → evaluateSpike no-ops via baseline < 20).  
9. `buildSignalsFromFacts` → `worstStatus` of signal statuses (and existing report overall). Include existing `buildRecommendations` warning/critical items as extra email rows by mapping them into the email builder as digest-like lines when `planAlertUpdates` emails.  
10. `planAlertUpdates`.  
11. Persist `HealthSnapshot` (`payload` = `{ signals, recommendations, environment, facts }`).  
12. Upsert open `HealthAlert` rows; mark recoveries.  
13. Delete buckets older than 8 days; snapshots older than 30 days.  
14. If `shouldEmail`, `sendHealthEmail`; on SMTP missing set `emailSkipped: "smtp_not_configured"`; on send fail leave `lastSentAt` unchanged so the next run retries. On success set `lastSentAt = now` for emailed open signals.  
15. Return the report.

Isolated collector failures: that signal uses status `warning`, `suggestedAction: COLLECTOR_FAILED_ACTION`, `detail: "collector failed, retry next run"`.

- [ ] **Step 4: Run tests**

Run: `npx vitest run src/lib/__tests__/health-run-check.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/health/run-health-check.ts src/lib/__tests__/health-run-check.test.ts
git commit -m "Orchestrate health snapshots, alerts, and email decisions."
```

---

### Task 9: SMTP sender and health-check route

**Files:**
- Create: `src/lib/health/send-smtp.ts`
- Create: `src/app/api/ops/health-check/route.ts`
- Modify: `package.json` (add `nodemailer` and `@types/nodemailer`)

**Interfaces:**
- Consumes: `buildAlertEmail`, `runHealthCheck`
- Produces: HTTP GET/POST `/api/ops/health-check`

- [ ] **Step 1: Install nodemailer**

Run: `npm install nodemailer`; `npm install -D @types/nodemailer`

- [ ] **Step 2: Implement `send-smtp.ts`**

If `SMTP_USER` or `SMTP_PASS` missing, return `{ sent: false, skipped: "smtp_not_configured" }`. Else `createTransport({ host: process.env.SMTP_HOST || "smtp.gmail.com", port: Number(process.env.SMTP_PORT || 465), secure: true, auth: { user, pass } })` and send to `process.env.ALERT_EMAIL || "mr.abhaysachan@gmail.com"` from `process.env.ALERT_FROM || SMTP_USER`. Catch errors and return `{ sent: false, skipped: "smtp_error" }`.

- [ ] **Step 3: Implement the route**

```ts
import { NextResponse } from "next/server";
import { runHealthCheck } from "@/lib/health/run-health-check";

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

function authorize(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    console.error("CRON_SECRET is not set");
    return false;
  }
  const header = req.headers.get("authorization") ?? "";
  return header === `Bearer ${secret}`;
}

async function handle(req: Request) {
  if (!authorize(req)) return unauthorized();
  const url = new URL(req.url);
  const digest = url.searchParams.get("digest") === "1";
  const sourceHeader = req.headers.get("x-health-source");
  const source =
    sourceHeader === "github-actions" || sourceHeader === "vercel-cron" || sourceHeader === "manual"
      ? sourceHeader
      : "vercel-cron";
  const result = await runHealthCheck({ source, digest });
  return NextResponse.json(result);
}

export const GET = handle;
export const POST = handle;
export const dynamic = "force-dynamic";
export const maxDuration = 60;
```

If `CRON_SECRET` is unset, **all** callers get 401 (including production without the env).

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json src/lib/health/send-smtp.ts src/app/api/ops/health-check/route.ts
git commit -m "Add authenticated health-check route and SMTP sending."
```

---

### Task 10: Cloud Vitals API and UI

**Files:**
- Modify: `src/app/api/system-health/route.ts`
- Modify: `src/lib/system-health-report.ts` (or a small loader `src/lib/health/load-dashboard.ts`)
- Modify: `src/app/admin/(protected)/cloud-vitals/AdminCloudVitalsPage.tsx`

**Interfaces:**
- Consumes: latest `HealthSnapshot`, open `HealthAlert` rows
- Produces: extra JSON fields `monitor: { signals, openAlerts, recentSnapshots }` on `/api/system-health`

- [ ] **Step 1: Extend `/api/system-health` JSON**

After `collectSystemHealthReport()`, also query:

- latest `healthSnapshot` by `createdAt desc`  
- `healthAlert` where `state = "open"`  
- last 24 `healthSnapshot` rows (`createdAt`, `overallStatus` only)

Attach `monitor: { signals, openAlerts, recentSnapshots }` (`signals` from latest payload, or `[]` if none).

- [ ] **Step 2: UI block on Cloud Vitals**

Insert **above** the vitals grid (after Overall status):

- Heading `Monitoring alerts`  
- If `openAlerts.length === 0`, text `No open alerts.`  
- Else list each open alert: Badge, title, detail, **Suggested action** paragraph  
- Table of latest `signals` (label, value, threshold, status, suggested action)  
- Compact list of last 24 snapshots: time + status badge  

Keep existing recommendation cards; they already show suggested actions for Cloud Vitals metrics.

- [ ] **Step 3: Typecheck the page against the new JSON**

Extend the local `HealthReport` type in `AdminCloudVitalsPage.tsx` with optional `monitor`. Render only when present.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/system-health/route.ts src/lib/health/load-dashboard.ts src/app/admin/(protected)/cloud-vitals/AdminCloudVitalsPage.tsx
git commit -m "Show open alerts and suggested actions on Cloud Vitals."
```

---

### Task 11: GitHub Actions site-health workflow

**Files:**
- Create: `scripts/send-health-alert.mjs`
- Create: `.github/workflows/site-health.yml`

**Interfaces:**
- Consumes: SMTP repo secrets; `CRON_SECRET`; `NEXTAUTH_URL`
- Produces: 5-minute probe that emails on down and POSTs health-check when up

- [ ] **Step 1: Write `scripts/send-health-alert.mjs`**

Node script (no TS): read `ALERT_EMAIL`, `SMTP_USER`, `SMTP_PASS`, `SMTP_HOST`, `SMTP_PORT`, `ALERT_SUBJECT`, `ALERT_TEXT`. Use `node:net` is not enough — use `nodemailer` from `node_modules` after `npm ci`. If SMTP env missing, print `smtp_not_configured` and exit 0 (do not fail the workflow). Send the site-down body:

```
[Auto Galaxy] CRITICAL: Site availability

Value: probe failed
Suggested action: Check the latest Vercel deployment and DNS for autogalaxy.in. Confirm `/api/health`.

Cloud Vitals: https://autogalaxy.in/admin/cloud-vitals
```

- [ ] **Step 2: Write `.github/workflows/site-health.yml`**

```yaml
name: Site health

on:
  schedule:
    - cron: "*/5 * * * *"
  workflow_dispatch:

jobs:
  probe:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - name: Probe site
        env:
          SITE_URL: ${{ vars.NEXTAUTH_URL || 'https://autogalaxy.in' }}
        run: |
          set +e
          curl -sS -o /tmp/home.html -w "%{http_code} %{time_total}" --max-time 5 "$SITE_URL/" > /tmp/home.meta
          HOME_EC=$?
          curl -sS -o /tmp/health.json -w "%{http_code} %{time_total}" --max-time 5 "$SITE_URL/api/health" > /tmp/health.meta
          HEALTH_EC=$?
          echo "home=$(cat /tmp/home.meta) ec=$HOME_EC"
          echo "health=$(cat /tmp/health.meta) ec=$HEALTH_EC"
          HOME_CODE=$(cut -d' ' -f1 /tmp/home.meta)
          HEALTH_CODE=$(cut -d' ' -f1 /tmp/health.meta)
          if [ "$HOME_EC" != "0" ] || [ "$HEALTH_EC" != "0" ] || [ "$HOME_CODE" -ge 400 ] || [ "$HEALTH_CODE" -ge 400 ]; then
            echo "down=1" >> "$GITHUB_ENV"
          else
            echo "down=0" >> "$GITHUB_ENV"
          fi
      - name: Email if down
        if: env.down == '1'
        env:
          SMTP_HOST: ${{ secrets.SMTP_HOST }}
          SMTP_PORT: ${{ secrets.SMTP_PORT }}
          SMTP_USER: ${{ secrets.SMTP_USER }}
          SMTP_PASS: ${{ secrets.SMTP_PASS }}
          ALERT_EMAIL: ${{ secrets.ALERT_EMAIL }}
          ALERT_FROM: ${{ secrets.ALERT_FROM }}
        run: node scripts/send-health-alert.mjs
      - name: Run in-app health check
        if: env.down == '0'
        env:
          SITE_URL: ${{ vars.NEXTAUTH_URL || 'https://autogalaxy.in' }}
          CRON_SECRET: ${{ secrets.CRON_SECRET }}
        run: |
          curl -sS --max-time 60 -X POST "$SITE_URL/api/ops/health-check" \
            -H "Authorization: Bearer $CRON_SECRET" \
            -H "x-health-source: github-actions"
```

Do not `exit 1` on site down (avoids noisy GitHub failure mail in addition to SMTP). Log enough for the Actions run UI (Cursor can read failing/odd runs).

- [ ] **Step 3: Commit**

```bash
git add scripts/send-health-alert.mjs .github/workflows/site-health.yml
git commit -m "Add five-minute GitHub Actions site probe and down email."
```

---

### Task 12: Vercel cron and operator docs

**Files:**
- Modify: `vercel.json`
- Modify: `PRODUCTION_SETUP.md`

**Interfaces:**
- Consumes: `/api/ops/health-check`
- Produces: scheduled GET with `Authorization` — **Vercel cron does not send custom headers by default.** Handle this: if `req.headers.get("x-vercel-cron") === "1"` (or the documented cron user-agent / `CRON_SECRET` query is **not** used — spec requires Bearer). Vercel cron sends header `Authorization: Bearer $CRON_SECRET` when `CRON_SECRET` is set in the project env (Vercel automatically attaches it). Document that `CRON_SECRET` must exist on Vercel for cron to be accepted.

- [ ] **Step 1: Update `vercel.json`**

Keep existing fields. Add:

```json
"crons": [
  { "path": "/api/ops/health-check", "schedule": "*/15 * * * *" },
  { "path": "/api/ops/health-check?digest=1", "schedule": "30 3 * * *" }
]
```

Note: Hobby accounts only run the daily job; GitHub Actions still covers 5 minutes. If Vercel rejects query strings on cron paths, add `src/app/api/ops/health-digest/route.ts` that calls the same handler with `digest: true` and point the second cron at `/api/ops/health-digest`.

- [ ] **Step 2: Document env in `PRODUCTION_SETUP.md`**

Add a table after existing env vars:

| Name | Value |
|------|--------|
| `CRON_SECRET` | random 32+ byte string |
| `SMTP_HOST` | `smtp.gmail.com` |
| `SMTP_PORT` | `465` |
| `SMTP_USER` | Gmail address |
| `SMTP_PASS` | Gmail app password |
| `ALERT_EMAIL` | `mr.abhaysachan@gmail.com` |
| `VERCEL_API_TOKEN` | optional, for usage % |
| `VERCEL_TEAM_ID` | optional |
| `VERCEL_PROJECT_ID` | optional |

GitHub repo secrets: same SMTP + `CRON_SECRET`. GitHub variable `NEXTAUTH_URL` = `https://autogalaxy.in`.

Cursor hourly automation (after deploy): schedule every hour; instructions: `GET https://autogalaxy.in/api/health` and if non-200 fail the run with suggested action from the spec availability row; if 200, `POST /api/ops/health-check` is not possible without leaking `CRON_SECRET` into the agent. Instead GET is enough for availability; the agent fails the run when `/api/health` is down so the coding agent is notified. Do not put SMTP passwords in the automation prompt.

- [ ] **Step 3: Commit**

```bash
git add vercel.json PRODUCTION_SETUP.md src/app/api/ops/health-digest/route.ts
git commit -m "Schedule Vercel health crons and document alert secrets."
```

---

### Task 13: Full verification

**Files:** none new (run commands)

- [ ] **Step 1: Unit tests**

Run: `npx vitest run`

Expected: all tests PASS, including health-* files

- [ ] **Step 2: Lint**

Run: `npx eslint src/lib/health src/app/api/ops src/app/admin/(protected)/cloud-vitals src/instrumentation.ts`

Expected: 0 errors

- [ ] **Step 3: Manual checklist (after deploy, not in this commit)**

1. Set Vercel + GitHub secrets.  
2. `workflow_dispatch` Site health.  
3. Temporarily stop SMTP to confirm snapshot still writes.  
4. Open `/admin/cloud-vitals` and confirm alerts block.  
5. Create Cursor hourly automation as documented.

---

## Spec coverage

| Spec item | Task |
|-----------|------|
| GitHub Actions 5-min ping + down email | 11 |
| POST health-check when up | 11, 9 |
| Vercel 15-min + 09:00 IST digest | 12 |
| Signal table + suggested actions | 1, 8 |
| One email per run, 45-min dedupe, upgrade, recover, digest | 2, 3, 8 |
| Minute buckets, no PII, 8-day retention | 4, 5, 6, 8 |
| Snapshots 30-day retention | 4, 8 |
| Cloud Vitals UI | 10 |
| SMTP skip if unset | 9 |
| Isolated collectors | 7, 8 |
| Cursor hourly check | 12 docs |
| Tests listed in spec | 1, 2, 3, 8 |

## Placeholder / type check

- Signal ids and `MonitorSignal` fields are identical across Tasks 1–10.  
- `planAlertUpdates` return shape is what `runHealthCheck` uses.  
- No Slack/SMS/auto-rollback in any task.
