import { NextResponse } from "next/server";
import { getVisitorCount, recordHomePageVisit } from "@/lib/visitor-count";

const noStoreHeaders = {
  "Cache-Control": "no-store, max-age=0",
};

export async function GET() {
  const data = await getVisitorCount();
  return NextResponse.json(data, { headers: noStoreHeaders });
}

export async function POST() {
  const data = await recordHomePageVisit();
  return NextResponse.json(data, { headers: noStoreHeaders });
}
