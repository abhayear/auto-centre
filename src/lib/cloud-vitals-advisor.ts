import { statusLabel, type MetricStatus } from "@/lib/system-health";

export type AdvisorChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export type AdvisorHealthContext = {
  generatedAt: string;
  overallStatus: MetricStatus;
  environment: {
    nodeVersion: string;
    vercelRegion: string | null;
    vercelEnv: string | null;
    siteUrl: string | null;
  };
  vitals: {
    id: string;
    label: string;
    value: string;
    status: MetricStatus;
    detail?: string;
  }[];
  hourlyTraffic: { hour: string; count: number }[];
  peakHour: { hour: string; count: number } | null;
  recommendations: {
    severity: MetricStatus;
    title: string;
    action: string;
  }[];
};

export const ADVISOR_SUGGESTED_PROMPTS = [
  "Should I scale up for more traffic?",
  "How do I prevent the site from crashing under load?",
  "What should I upgrade first on Vercel or Neon?",
  "How can I improve page performance?",
  "Summarize my current cloud health",
] as const;

function vitalById(context: AdvisorHealthContext, id: string) {
  return context.vitals.find((v) => v.id === id);
}

function formatContextSummary(context: AdvisorHealthContext): string {
  const lines = [
    `Overall: ${statusLabel(context.overallStatus)}`,
    `Site: ${context.environment.siteUrl ?? "local dev"}`,
    `Region: ${context.environment.vercelRegion ?? "n/a"}`,
    ...context.vitals.map((v) => `- ${v.label}: ${v.value} (${statusLabel(v.status)})`),
  ];
  if (context.peakHour) {
    lines.push(`Peak hour (24h): ${context.peakHour.count} visits`);
  }
  return lines.join("\n");
}

function pickFollowUps(context: AdvisorHealthContext): string[] {
  const followUps: string[] = [];
  const db = vitalById(context, "db-latency");
  const traffic = vitalById(context, "traffic-hour");

  if (db?.status !== "ok") {
    followUps.push("How do I fix database latency on Neon?");
  }
  if (traffic?.status !== "ok") {
    followUps.push("What Vercel plan do I need for this traffic?");
  }
  if (context.vitals.some((v) => v.id.startsWith("web-") && v.status !== "ok")) {
    followUps.push("Give me a performance optimization checklist");
  }
  if (followUps.length === 0) {
    followUps.push("What should I monitor during a festival sale?");
    followUps.push("When should I scale Neon vs Vercel?");
  }
  return followUps.slice(0, 3);
}

function replyScaleUp(context: AdvisorHealthContext): string {
  const trafficHour = vitalById(context, "traffic-hour");
  const trafficToday = vitalById(context, "traffic-today");
  const db = vitalById(context, "db-latency");
  const heap = vitalById(context, "heap");
  const rows = vitalById(context, "analytics-rows");

  const steps: string[] = [];

  if (context.overallStatus === "ok") {
    steps.push(
      "Your vitals look healthy right now. You do not need to scale immediately, but plan ahead if you expect a campaign or festival rush.",
    );
  } else {
    steps.push(
      `Your overall status is **${statusLabel(context.overallStatus)}** — scaling or tuning should be prioritized before traffic grows further.`,
    );
  }

  if (trafficHour?.status !== "ok" || trafficToday?.status !== "ok") {
    steps.push(
      "**Traffic load:** Visits are elevated. On **Vercel**, consider Pro for higher concurrency and longer function duration. Enable caching on public pages and avoid heavy admin work during peak hours.",
    );
  }

  if (db?.status !== "ok") {
    steps.push(
      "**Database (Neon):** Latency is high or unreachable. Upgrade compute in the Neon console, confirm connection pooling (`?pgbouncer=true`), and prune old `SiteVisit` rows if analytics table is large.",
    );
  }

  if (heap?.status !== "ok") {
    steps.push(
      "**Server memory:** Heap usage is high for a serverless instance. Reduce work per request, paginate admin lists, and split heavy API calls.",
    );
  }

  if (rows?.status !== "ok") {
    steps.push(
      "**Storage:** Analytics rows are growing. Archive or delete visits older than 90 days to keep Postgres fast and cheap.",
    );
  }

  steps.push(
    "**Suggested order:** (1) Fix database if critical → (2) Vercel concurrency/bandwidth → (3) Frontend web vitals → (4) Schedule content updates off-peak.",
  );

  return steps.join("\n\n");
}

function replyLoadManagement(context: AdvisorHealthContext): string {
  const peak = context.peakHour?.count ?? 0;
  const hourTraffic = vitalById(context, "traffic-hour");

  return [
    "**Load management plan for Auto Galaxy**",
    "",
    `Current load: **${hourTraffic?.value ?? "0"}** visits in the last hour; peak hour in 24h was **${peak}** visits.`,
    "",
    "1. **Rate-limit writes** — booking and inquiry forms are the heaviest DB writes; monitor pending counts in admin.",
    "2. **Cache public pages** — home, vehicles, and services can use Next.js static/regional caching where data changes infrequently.",
    "3. **Neon autoscaling** — enable scale-to-zero off-peak but allow compute to grow during peak hours in Neon settings.",
    "4. **Watch Cloud Vitals hourly chart** — if one hour exceeds ~500 visits, prepare Vercel Pro and Neon scale-up.",
    "5. **Emergency checklist** — if the site slows: check Neon status → Vercel deployment logs → `/api/health` → reduce image sizes on homepage.",
    "",
    context.overallStatus === "critical"
      ? "⚠️ Status is critical — address database and traffic items today before running ads or WhatsApp campaigns."
      : "Status is manageable — set a daily Cloud Vitals check during high-traffic weeks.",
  ].join("\n");
}

function replyPerformance(context: AdvisorHealthContext): string {
  const webVitals = context.vitals.filter((v) => v.id.startsWith("web-"));
  const lines = [
    "**Performance recommendations** (based on your last 24h web vitals):",
    "",
  ];

  if (webVitals.length === 0) {
    lines.push(
      "No web vitals samples yet. Browse the public site from mobile and desktop, then ask again in a few minutes.",
    );
  } else {
    for (const vital of webVitals) {
      lines.push(`- **${vital.label}:** ${vital.value} — ${statusLabel(vital.status)}`);
    }
    lines.push("");
    lines.push("**Quick wins:**");
    lines.push("- Compress hero and vehicle images; use Next.js `<Image>` with proper sizes");
    lines.push("- Keep above-the-fold JS minimal; defer analytics recorders");
    lines.push("- Reserve space for notice banner and visitor count to reduce CLS");
    lines.push("- If TTFB is high, check Neon latency in Cloud Vitals and enable DB pooling");
  }

  const db = vitalById(context, "db-latency");
  if (db?.status !== "ok") {
    lines.push("");
    lines.push(
      `Database latency (${db.value}) is hurting TTFB. Fix Neon first — frontend optimizations alone will not fully help.`,
    );
  }

  return lines.join("\n");
}

function replyDatabase(context: AdvisorHealthContext): string {
  const db = vitalById(context, "db-latency");
  const size = vitalById(context, "db-size");

  return [
    "**Database (Neon Postgres) guidance**",
    "",
    `- Latency: **${db?.value ?? "unknown"}** (${statusLabel(db?.status ?? "ok")})`,
    `- Storage: **${size?.value ?? "unknown"}**`,
    "",
    "**If slow or unreachable:**",
    "1. Open [Neon console](https://console.neon.tech) → increase compute size",
    "2. Use pooled connection string for serverless (Vercel env `DATABASE_URL`)",
    "3. Run migrations during low traffic; avoid `build:prod` on every deploy if lock timeouts occur",
    "4. Index heavy tables; prune old `SiteVisit` and `WebVitalsSample` rows",
    "",
    "**If connection errors:** verify `DATABASE_URL` on Vercel matches Neon production branch.",
  ].join("\n");
}

function replySummary(context: AdvisorHealthContext): string {
  const alertItems = context.recommendations.filter((r) => r.severity !== "ok");
  const lines = [
    `**Cloud health summary** — ${statusLabel(context.overallStatus)}`,
    "",
    formatContextSummary(context),
    "",
  ];

  if (alertItems.length === 0) {
    lines.push("No urgent issues. Continue monitoring during marketing pushes.");
  } else {
    lines.push("**Priority actions:**");
    for (const item of alertItems) {
      lines.push(`- **${item.title}:** ${item.action}`);
    }
  }

  return lines.join("\n");
}

function replyDefault(context: AdvisorHealthContext, message: string): string {
  return [
    "I can help with **scaling**, **load management**, **performance**, and **Neon/Vercel** tuning based on your live Cloud Vitals.",
    "",
    replySummary(context),
    "",
    `You asked: “${message.slice(0, 200)}”`,
    "",
    "Try: “Should I scale up?” or “How do I prevent crashes under load?” for a focused plan.",
  ].join("\n");
}

function classifyIntent(message: string): string {
  const q = message.toLowerCase();
  if (/scale|upgrade|plan|tier|pro|grow|capacity/.test(q)) return "scale";
  if (/load|traffic|crash|down|visitor|spike|concurrent|rush|sale/.test(q)) return "load";
  if (/performance|lcp|cls|inp|ttfb|speed|slow|vital|fast/.test(q)) return "performance";
  if (/database|neon|postgres|sql|latency|db|storage/.test(q)) return "database";
  if (/vercel|host|deploy|function|serverless|region/.test(q)) return "vercel";
  if (/summary|status|overview|health|report|current/.test(q)) return "summary";
  return "default";
}

function replyVercel(context: AdvisorHealthContext): string {
  const region = context.environment.vercelRegion ?? "iad1 (default US East)";
  return [
    "**Vercel hosting guidance**",
    "",
    `- Deploy region: **${region}**`,
    `- Environment: **${context.environment.vercelEnv ?? "development"}**`,
    "",
    "**When to upgrade Vercel:**",
    "- Hobby limits hit: bandwidth, serverless execution time, or concurrent functions during peaks",
    "- Need team analytics, password protection, or higher SLA",
    "",
    "**Load tips on Vercel:**",
    "- Keep API routes lean; move heavy admin exports off peak hours",
    "- Use `/api/health` for uptime checks",
    "- Review function duration in Vercel → Observability after traffic spikes",
    "",
    "Pair Vercel scaling with **Neon compute** — fixing only one layer leaves bottlenecks.",
  ].join("\n");
}

export function getDynamicSuggestedPrompts(context: AdvisorHealthContext): string[] {
  const prompts = new Set<string>();

  if (context.overallStatus !== "ok") {
    prompts.add("What should I upgrade first on Vercel or Neon?");
  }
  if (vitalById(context, "traffic-hour")?.status !== "ok") {
    prompts.add("Should I scale up for more traffic?");
  }
  if (context.vitals.some((v) => v.id.startsWith("web-") && v.status !== "ok")) {
    prompts.add("How can I improve page performance?");
  }
  if (vitalById(context, "db-latency")?.status !== "ok") {
    prompts.add("How do I fix database latency on Neon?");
  }

  for (const p of ADVISOR_SUGGESTED_PROMPTS) {
    prompts.add(p);
  }

  return Array.from(prompts).slice(0, 5);
}

export function generateRuleBasedAdvisorReply(
  message: string,
  context: AdvisorHealthContext,
): { reply: string; followUps: string[] } {
  const intent = classifyIntent(message);

  let reply: string;
  switch (intent) {
    case "scale":
      reply = replyScaleUp(context);
      break;
    case "load":
      reply = replyLoadManagement(context);
      break;
    case "performance":
      reply = replyPerformance(context);
      break;
    case "database":
      reply = replyDatabase(context);
      break;
    case "vercel":
      reply = replyVercel(context);
      break;
    case "summary":
      reply = replySummary(context);
      break;
    default:
      reply = replyDefault(context, message);
  }

  return { reply, followUps: pickFollowUps(context) };
}

export function buildAdvisorSystemPrompt(context: AdvisorHealthContext): string {
  return [
    "You are the Auto Galaxy Cloud Vitals AI advisor — like Cursor's assistant but focused on site reliability.",
    "Stack: Next.js on Vercel, PostgreSQL on Neon, Prisma ORM.",
    "Give concise, actionable advice on scaling, load management, performance, and cost-aware upgrades.",
    "Use bullet points and numbered steps. Reference actual metric values from context.",
    "Never invent metrics not in context. If healthy, say scaling can wait but give preventive tips.",
    "Do not mention internal code paths unless helpful. Keep answers under 400 words.",
    "",
    "Current vitals context:",
    formatContextSummary(context),
    "",
    "Existing automated recommendations:",
    ...context.recommendations.map((r) => `- [${r.severity}] ${r.title}: ${r.action}`),
  ].join("\n");
}

export async function generateAdvisorReply(
  message: string,
  context: AdvisorHealthContext,
  history: AdvisorChatMessage[] = [],
): Promise<{ reply: string; followUps: string[]; usedAi: boolean }> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  const model = process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini";

  if (apiKey) {
    try {
      const messages = [
        { role: "system" as const, content: buildAdvisorSystemPrompt(context) },
        ...history.slice(-8).map((m) => ({ role: m.role, content: m.content })),
        { role: "user" as const, content: message },
      ];

      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          messages,
          max_tokens: 700,
          temperature: 0.35,
        }),
      });

      if (response.ok) {
        const data = (await response.json()) as {
          choices?: { message?: { content?: string } }[];
        };
        const content = data.choices?.[0]?.message?.content?.trim();
        if (content) {
          return {
            reply: content,
            followUps: pickFollowUps(context),
            usedAi: true,
          };
        }
      }
    } catch {
      // fall through to rule-based advisor
    }
  }

  const rule = generateRuleBasedAdvisorReply(message, context);
  return { ...rule, usedAi: false };
}
