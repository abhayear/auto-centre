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
  try {
    if (!authorize(req)) return unauthorized();
    const url = new URL(req.url);
    const digest = url.searchParams.get("digest") === "1";
    const sourceHeader = req.headers.get("x-health-source");
    const source =
      sourceHeader === "github-actions" ||
      sourceHeader === "vercel-cron" ||
      sourceHeader === "manual"
        ? sourceHeader
        : "vercel-cron";
    const result = await runHealthCheck({ source, digest });
    return NextResponse.json(result);
  } catch (error) {
    console.error("Health check failed", error);
    return NextResponse.json({ error: "health_check_failed" }, { status: 500 });
  }
}

export const GET = handle;
export const POST = handle;
export const dynamic = "force-dynamic";
export const maxDuration = 60;
