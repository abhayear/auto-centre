import { observeRoute } from "@/lib/health/observe-route";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { recordWebVitalSample } from "@/lib/system-health-report";
import { formatZodErrors, webVitalsSchema } from "@/lib/validators";

 async function postHandler(request: NextRequest) {
  try {
    const body = await request.json();
    const data = webVitalsSchema.parse(body);

    await recordWebVitalSample({
      name: data.name,
      value: data.value,
      rating: data.rating,
      path: data.path,
    });

    return NextResponse.json({ recorded: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: formatZodErrors(error) },
        { status: 400 },
      );
    }
    return NextResponse.json({ error: "Failed to record web vital" }, { status: 500 });
  }
}

export const POST = observeRoute(postHandler);
