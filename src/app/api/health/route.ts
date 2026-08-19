import { observeRoute } from "@/lib/health/observe-route";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

 async function getHandler() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ status: "ok", timestamp: new Date().toISOString() });
  } catch {
    return NextResponse.json(
      { status: "error", message: "Database unreachable" },
      { status: 503 },
    );
  }
}

export const GET = observeRoute(getHandler);
