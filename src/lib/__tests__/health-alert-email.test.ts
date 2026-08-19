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
      recommendations: [
        {
          severity: "warning",
          title: "Traffic is high",
          action: "Review traffic sources.",
        },
      ],
      digest: false,
      overallStatus: "ok",
      siteUrl: "https://autogalaxy.in",
    });
    expect(email.subject).toBe("[Auto Galaxy] Recovered: Site availability");
    expect(email.text).toContain("no further action unless it returns");
    expect(email.text).toContain("Traffic is high");
  });
});
