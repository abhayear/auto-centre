import { observeRoute } from "@/lib/health/observe-route";
import { NextResponse } from "next/server";
import { requireStaffSession } from "@/lib/auth";
import { canManageBuyingPortals } from "@/lib/inventory-access";
import { normalizeWebsiteUrl, serializeBuyingPortal } from "@/lib/inventory-portals";
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
  const body = (await request.json()) as Record<string, unknown>;
  if (typeof body.websiteUrl === "string") {
    body.websiteUrl = normalizeWebsiteUrl(body.websiteUrl);
  }
  const parsed = createBuyingPortalSchema.safeParse(body);
  if (!parsed.success) {
    const websiteInvalid = parsed.error.issues.some((issue) => issue.path.includes("websiteUrl"));
    return NextResponse.json(
      {
        error: websiteInvalid
          ? "Check the website address and try again"
          : "Enter a supplier name. Buy link, username, and password are optional.",
      },
      { status: 400 },
    );
  }
  const username = parsed.data.username ?? "";
  const passwordEncrypted = encryptPortalPassword(parsed.data.password ?? "");
  const websiteUrl = parsed.data.websiteUrl ?? "";
  const row = await prisma.buyingPortal.upsert({
    where: { name: parsed.data.name },
    create: {
      name: parsed.data.name,
      websiteUrl,
      username,
      passwordEncrypted,
      enabled: parsed.data.enabled ?? true,
      connectorId: parsed.data.connectorId ?? null,
      createdByEmail: session.user.email,
      whatsappCatalogueNo: parsed.data.whatsappCatalogueNo ?? "",
    },
    update: {
      ...(websiteUrl ? { websiteUrl } : {}),
      ...(username ? { username } : {}),
      ...(parsed.data.password ? { passwordEncrypted } : {}),
      ...(parsed.data.whatsappCatalogueNo !== undefined
        ? { whatsappCatalogueNo: parsed.data.whatsappCatalogueNo }
        : {}),
    },
  });
  return NextResponse.json(serializeBuyingPortal(row), { status: 201 });
}

export const GET = observeRoute(getHandler);
export const POST = observeRoute(postHandler);
