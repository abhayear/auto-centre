import { observeRoute } from "@/lib/health/observe-route";
import { NextResponse } from "next/server";
import { requireStaffSession } from "@/lib/auth";
import { canManageBuyingPortals } from "@/lib/inventory-access";
import { runBuyingPortalSync } from "@/lib/inventory-sync";

async function postHandler(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = await requireStaffSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!canManageBuyingPortals(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await context.params;
  const result = await runBuyingPortalSync(id);
  return NextResponse.json(result);
}

export const POST = observeRoute(postHandler);
