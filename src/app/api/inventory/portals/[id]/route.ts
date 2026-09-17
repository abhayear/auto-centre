import { observeRoute } from "@/lib/health/observe-route";
import { NextResponse } from "next/server";
import { requireStaffSession } from "@/lib/auth";
import { canManageBuyingPortals } from "@/lib/inventory-access";
import { normalizeWebsiteUrl, serializeBuyingPortal } from "@/lib/inventory-portals";
import { encryptPortalPassword } from "@/lib/portal-password";
import { prisma } from "@/lib/prisma";
import { updateBuyingPortalSchema } from "@/lib/validators";

async function patchHandler(
  request: Request,
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
  const body = (await request.json()) as Record<string, unknown>;
  if (typeof body.websiteUrl === "string") {
    body.websiteUrl = normalizeWebsiteUrl(body.websiteUrl);
  }
  const parsed = updateBuyingPortalSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Check the website address and try again" },
      { status: 400 },
    );
  }
  const data: {
    name?: string;
    websiteUrl?: string;
    username?: string;
    passwordEncrypted?: string;
    enabled?: boolean;
    connectorId?: string | null;
    whatsappCatalogueNo?: string;
    serviceKind?: string;
  } = {};
  if (parsed.data.name !== undefined) data.name = parsed.data.name;
  if (parsed.data.websiteUrl !== undefined) data.websiteUrl = parsed.data.websiteUrl;
  if (parsed.data.username !== undefined) data.username = parsed.data.username;
  if (parsed.data.enabled !== undefined) data.enabled = parsed.data.enabled;
  if (parsed.data.connectorId !== undefined) data.connectorId = parsed.data.connectorId;
  if (parsed.data.whatsappCatalogueNo !== undefined) {
    data.whatsappCatalogueNo = parsed.data.whatsappCatalogueNo;
  }
  if (parsed.data.serviceKind !== undefined) data.serviceKind = parsed.data.serviceKind;
  if (parsed.data.password) {
    data.passwordEncrypted = encryptPortalPassword(parsed.data.password);
  }
  const row = await prisma.buyingPortal.update({ where: { id }, data });
  return NextResponse.json(serializeBuyingPortal(row));
}

export const PATCH = observeRoute(patchHandler);
