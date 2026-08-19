import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { MonitoringAlerts } from "@/app/admin/(protected)/cloud-vitals/AdminCloudVitalsPage";

describe("MonitoringAlerts", () => {
  it("shows the empty alert state", () => {
    const html = renderToStaticMarkup(
      React.createElement(MonitoringAlerts, {
        monitor: { signals: [], openAlerts: [], recentSnapshots: [] },
      }),
    );

    expect(html).toContain("Monitoring alerts");
    expect(html).toContain("No open alerts.");
  });

  it("shows alerts, signals, suggested actions, and recent snapshots", () => {
    const html = renderToStaticMarkup(
      React.createElement(MonitoringAlerts, {
        monitor: {
          signals: [
            {
              id: "availability",
              label: "Site availability",
              value: "offline",
              threshold: "2 consecutive failures",
              status: "critical",
              suggestedAction: "Check the deployment logs.",
            },
          ],
          openAlerts: [
            {
              id: "alert-1",
              severity: "critical",
              title: "Site availability",
              detail: "offline",
              suggestedAction: "Check the deployment logs.",
            },
          ],
          recentSnapshots: [
            {
              createdAt: "2026-08-19T05:00:00.000Z",
              overallStatus: "critical",
            },
          ],
        },
      }),
    );

    expect(html).toContain("Suggested action");
    expect(html).toContain("2 consecutive failures");
    expect(html).toContain("Recent snapshots");
    expect(html).toContain("Critical");
  });
});
