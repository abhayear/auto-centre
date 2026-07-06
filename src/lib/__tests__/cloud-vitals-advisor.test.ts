import { describe, expect, it } from "vitest";
import {
  generateRuleBasedAdvisorReply,
  getDynamicSuggestedPrompts,
  type AdvisorHealthContext,
} from "@/lib/cloud-vitals-advisor";

const baseContext: AdvisorHealthContext = {
  generatedAt: new Date().toISOString(),
  overallStatus: "warning",
  environment: {
    nodeVersion: "v20.0.0",
    vercelRegion: "iad1",
    vercelEnv: "production",
    siteUrl: "https://autogltp.info",
  },
  vitals: [
    {
      id: "db-latency",
      label: "Database latency",
      value: "450 ms",
      status: "warning",
    },
    {
      id: "traffic-hour",
      label: "Visits (last hour)",
      value: "620",
      status: "warning",
    },
    {
      id: "web-lcp",
      label: "LCP (p75, 24h)",
      value: "2.8 s",
      status: "warning",
    },
  ],
  hourlyTraffic: [{ hour: new Date().toISOString(), count: 620 }],
  peakHour: { hour: new Date().toISOString(), count: 620 },
  recommendations: [
    {
      severity: "warning",
      title: "Database response is slow",
      action: "Upgrade Neon compute.",
    },
  ],
};

describe("generateRuleBasedAdvisorReply", () => {
  it("returns scaling guidance for scale questions", () => {
    const { reply } = generateRuleBasedAdvisorReply(
      "Should I scale up for festival traffic?",
      baseContext,
    );
    expect(reply.toLowerCase()).toContain("vercel");
    expect(reply.toLowerCase()).toContain("neon");
  });

  it("returns load management for traffic questions", () => {
    const { reply } = generateRuleBasedAdvisorReply(
      "How do I prevent crashes under heavy load?",
      baseContext,
    );
    expect(reply).toContain("Load management");
  });

  it("summarizes health on overview questions", () => {
    const { reply } = generateRuleBasedAdvisorReply(
      "Summarize my current cloud health",
      baseContext,
    );
    expect(reply).toContain("Cloud health summary");
    expect(reply).toContain("Database latency");
  });
});

describe("getDynamicSuggestedPrompts", () => {
  it("includes traffic prompt when load is elevated", () => {
    const prompts = getDynamicSuggestedPrompts(baseContext);
    expect(prompts.some((p) => p.toLowerCase().includes("scale"))).toBe(true);
  });
});
