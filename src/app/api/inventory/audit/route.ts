import { observeRoute } from "@/lib/health/observe-route";
import { NextResponse } from "next/server";
import { requireStaffSession } from "@/lib/auth";
import { canAuditInventory } from "@/lib/inventory-access";
import { prisma } from "@/lib/prisma";
import { auditQuerySchema } from "@/lib/validators";

async function getHandler(request: Request) {
  const session = await requireStaffSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!canAuditInventory(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const url = new URL(request.url);
  const parsed = auditQuerySchema.safeParse({
    partId: url.searchParams.get("partId") || undefined,
    from: url.searchParams.get("from") || undefined,
    to: url.searchParams.get("to") || undefined,
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed" }, { status: 400 });
  }
  const createdAt: { gte?: Date; lte?: Date } = {};
  if (parsed.data.from) createdAt.gte = new Date(`${parsed.data.from}T00:00:00.000Z`);
  if (parsed.data.to) createdAt.lte = new Date(`${parsed.data.to}T23:59:59.999Z`);
  const movements = await prisma.stockMovement.findMany({
    where: {
      ...(parsed.data.partId ? { partId: parsed.data.partId } : {}),
      ...(Object.keys(createdAt).length ? { createdAt } : {}),
    },
    orderBy: { createdAt: "asc" },
    include: { part: true },
  });
  return NextResponse.json(
    movements.map((row) => ({
      id: row.id,
      kind: row.kind,
      qtyDelta: row.qtyDelta,
      qtyAfter: row.qtyAfter,
      jobRef: row.jobRef,
      note: row.note,
      actorEmail: row.actorEmail,
      createdAt: row.createdAt.toISOString(),
      partCode: row.part.code,
      partName: row.part.name,
      purchaseRate: Number(row.part.purchaseRate),
      sellingPrice: Number(row.part.sellingPrice),
    })),
  );
}

export const GET = observeRoute(getHandler);
