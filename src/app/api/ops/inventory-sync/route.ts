import { NextResponse } from "next/server";
import { runEnabledBuyingPortalSyncs } from "@/lib/inventory-sync";

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
  await runEnabledBuyingPortalSyncs();
  return NextResponse.json({ ok: true });
}

export const GET = handle;
export const POST = handle;
export const dynamic = "force-dynamic";
export const maxDuration = 60;
