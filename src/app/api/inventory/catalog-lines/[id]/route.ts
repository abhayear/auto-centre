import { observeRoute } from "@/lib/health/observe-route";
import { NextResponse } from "next/server";
import { requireStaffSession } from "@/lib/auth";
import { canReceiveInventory } from "@/lib/inventory-access";
import { prisma } from "@/lib/prisma";
import { linkCatalogLineSchema } from "@/lib/validators";

async function patchHandler(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = await requireStaffSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!canReceiveInventory(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const parsed = linkCatalogLineSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed" }, { status: 400 });
  }
  const { id } = await context.params;
  const line = await prisma.portalCatalogLine.update({
    where: { id },
    data: { inventoryPartId: parsed.data.inventoryPartId },
  });
  return NextResponse.json(line);
}

export const PATCH = observeRoute(patchHandler);
