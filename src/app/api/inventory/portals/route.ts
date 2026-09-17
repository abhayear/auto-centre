import { observeRoute } from "@/lib/health/observe-route";
import { NextResponse } from "next/server";
import { requireStaffSession } from "@/lib/auth";
import { canManageBuyingPortals } from "@/lib/inventory-access";
import { serializeBuyingPortal } from "@/lib/inventory-portals";
import { encryptPortalPassword } from "@/lib/portal-password";
import { prisma } from "@/lib/prisma";
import { createBuyingPortalSchema } from "@/lib/validators";

async function getHandler(_request: Request) {
  const session = await requireStaffSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!canManageBuyingPortals(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const rows = await prisma.buyingPortal.findMany({ orderBy: { name: "asc" } });
  return NextResponse.json(rows.map(serializeBuyingPortal));
}

async function postHandler(request: Request) {
  const session = await requireStaffSession();
  if (!session?.user.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!canManageBuyingPortals(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const parsed = createBuyingPortalSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed" }, { status: 400 });
  }
  const row = await prisma.buyingPortal.create({
    data: {
      name: parsed.data.name,
      websiteUrl: parsed.data.websiteUrl,
      username: parsed.data.username ?? "",
      passwordEncrypted: encryptPortalPassword(parsed.data.password ?? ""),
      enabled: parsed.data.enabled ?? true,
      connectorId: parsed.data.connectorId ?? null,
      createdByEmail: session.user.email,
    },
  });
  return NextResponse.json(serializeBuyingPortal(row), { status: 201 });
}

export const GET = observeRoute(getHandler);
export const POST = observeRoute(postHandler);
