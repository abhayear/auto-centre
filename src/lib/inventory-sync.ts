import { Prisma } from "@prisma/client";
import { getBuyingConnector, NO_CONNECTOR_ERROR } from "@/lib/inventory-connectors";
import { decryptPortalPassword } from "@/lib/portal-password";
import { prisma } from "@/lib/prisma";

export function applyCatalogRateToPart(
  part: { purchaseRate: number; sellingPrice: number },
  livePurchaseRate: number,
): { purchaseRate: number; sellingPrice: number } {
  return { purchaseRate: livePurchaseRate, sellingPrice: part.sellingPrice };
}

export async function runBuyingPortalSync(portalId: string): Promise<{
  ok: boolean;
  lastError: string | null;
}> {
  const portal = await prisma.buyingPortal.findUnique({ where: { id: portalId } });
  if (!portal) {
    return { ok: false, lastError: "Portal not found" };
  }

  const connector = getBuyingConnector(portal.connectorId);
  if (!connector) {
    const lastError = NO_CONNECTOR_ERROR;
    await prisma.buyingPortal.update({
      where: { id: portalId },
      data: { lastError, lastSyncedAt: new Date() },
    });
    return { ok: false, lastError };
  }

  try {
    const creds = {
      websiteUrl: portal.websiteUrl,
      username: portal.username,
      password: decryptPortalPassword(portal.passwordEncrypted),
    };
    const [bills, catalog] = await Promise.all([
      connector.fetchBills(creds),
      connector.fetchCatalog(creds),
    ]);

    for (const line of catalog) {
      const catalogLine = await prisma.portalCatalogLine.upsert({
        where: {
          portalId_vendorSku: { portalId, vendorSku: line.vendorSku },
        },
        create: {
          portalId,
          vendorSku: line.vendorSku,
          vendorName: line.vendorName,
          livePurchaseRate: new Prisma.Decimal(line.livePurchaseRate),
          lastSyncedAt: new Date(),
        },
        update: {
          vendorName: line.vendorName,
          livePurchaseRate: new Prisma.Decimal(line.livePurchaseRate),
          lastSyncedAt: new Date(),
        },
      });

      if (catalogLine.inventoryPartId) {
        const part = await prisma.inventoryPart.findUnique({
          where: { id: catalogLine.inventoryPartId },
        });
        if (part) {
          const next = applyCatalogRateToPart(
            {
              purchaseRate: Number(part.purchaseRate),
              sellingPrice: Number(part.sellingPrice),
            },
            line.livePurchaseRate,
          );
          await prisma.$transaction([
            prisma.inventoryPart.update({
              where: { id: part.id },
              data: { purchaseRate: new Prisma.Decimal(next.purchaseRate) },
            }),
            prisma.rateChangeLog.create({
              data: {
                partId: part.id,
                field: "purchaseRate",
                oldValue: part.purchaseRate,
                newValue: new Prisma.Decimal(next.purchaseRate),
                source: "portal_sync",
                actorEmail: "portal_sync",
              },
            }),
          ]);
        }
      }
    }

    for (const bill of bills) {
      await prisma.purchaseBill.upsert({
        where: {
          portalId_billNumber: { portalId, billNumber: bill.billNumber },
        },
        create: {
          portalId,
          billNumber: bill.billNumber,
          billDate: new Date(`${bill.billDate}T00:00:00.000Z`),
          source: "synced",
          status: "draft",
        },
        update: {},
      });
    }

    await prisma.buyingPortal.update({
      where: { id: portalId },
      data: { lastError: null, lastSyncedAt: new Date() },
    });
    return { ok: true, lastError: null };
  } catch (error) {
    const lastError = error instanceof Error ? error.message : "Sync failed";
    await prisma.buyingPortal.update({
      where: { id: portalId },
      data: { lastError, lastSyncedAt: new Date() },
    });
    return { ok: false, lastError };
  }
}

export async function runEnabledBuyingPortalSyncs(): Promise<void> {
  const portals = await prisma.buyingPortal.findMany({ where: { enabled: true } });
  for (const portal of portals) {
    await runBuyingPortalSync(portal.id);
  }
}
