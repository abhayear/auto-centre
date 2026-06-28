import { NextResponse } from "next/server";
import { parseGeoFromHeaders, recordSiteVisit } from "@/lib/site-analytics";
import { getVisitorCount, recordHomePageVisit } from "@/lib/visitor-count";

const noStoreHeaders = {
  "Cache-Control": "no-store, max-age=0",
};

export async function GET() {
  const data = await getVisitorCount();
  return NextResponse.json(data, { headers: noStoreHeaders });
}

export async function POST(request: Request) {
  const geo = parseGeoFromHeaders(request.headers);

  await recordSiteVisit({
    path: "/",
    ...geo,
    userAgent: request.headers.get("user-agent"),
    referer: request.headers.get("referer"),
  });

  const data = await recordHomePageVisit();
  return NextResponse.json(data, { headers: noStoreHeaders });
}
