export function normalizeWebsiteUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return trimmed;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

export const SEED_BUYING_PORTALS: { name: string; websiteUrl: string }[] = [
  { name: "Elyf EV Spare", websiteUrl: "https://example.com/elyf" },
  { name: "Vishal Bearing House", websiteUrl: "https://example.com/vishal-bearing-house" },
  { name: "Maple", websiteUrl: "https://example.com/maple" },
  { name: "Komaki", websiteUrl: "https://example.com/komaki" },
  { name: "E Indiabull", websiteUrl: "https://example.com/e-indiabull" },
  { name: "R K Enterprises", websiteUrl: "https://example.com/rk-enterprises" },
];

export const BUYING_PORTAL_SERVICE_KINDS = [
  "supplier",
  "delivery",
  "local_courier",
  "transport",
] as const;

export type BuyingPortalServiceKind = (typeof BUYING_PORTAL_SERVICE_KINDS)[number];

export const BUYING_PORTAL_SERVICE_KIND_LABELS: Record<BuyingPortalServiceKind, string> = {
  supplier: "Supplier",
  delivery: "Delivery",
  local_courier: "Local courier",
  transport: "Transport",
};

export function isCourierServiceKind(kind: string | undefined): boolean {
  return kind === "delivery" || kind === "local_courier" || kind === "transport";
}

export type PublicBuyingPortal = {
  id: string;
  name: string;
  websiteUrl: string;
  username: string;
  passwordSaved: boolean;
  enabled: boolean;
  connectorId: string | null;
  lastSyncedAt: string | null;
  lastError: string | null;
  whatsappCatalogueNo: string;
  serviceKind: BuyingPortalServiceKind;
};

export function serializeBuyingPortal(row: {
  id: string;
  name: string;
  websiteUrl: string;
  username: string;
  passwordEncrypted: string;
  enabled: boolean;
  connectorId: string | null;
  lastSyncedAt: Date | null;
  lastError: string | null;
  whatsappCatalogueNo?: string;
  serviceKind?: string | null;
}): PublicBuyingPortal {
  const serviceKind = BUYING_PORTAL_SERVICE_KINDS.includes(row.serviceKind as BuyingPortalServiceKind)
    ? (row.serviceKind as BuyingPortalServiceKind)
    : "supplier";
  return {
    id: row.id,
    name: row.name,
    websiteUrl: row.websiteUrl,
    username: row.username,
    passwordSaved: Boolean(row.passwordEncrypted),
    enabled: row.enabled,
    connectorId: row.connectorId,
    lastSyncedAt: row.lastSyncedAt ? row.lastSyncedAt.toISOString() : null,
    lastError: row.lastError,
    whatsappCatalogueNo: row.whatsappCatalogueNo ?? "",
    serviceKind,
  };
}

export function whatsappOrderHref(
  no: string,
  supplierName = "",
  kind: string = "supplier",
): string | null {
  const digits = no.replace(/\D/g, "");
  if (digits.length < 10) return null;
  const withCountry = digits.length === 10 ? `91${digits}` : digits;
  const greeting = supplierName.trim() ? ` ${supplierName.trim()}` : "";
  const text = encodeURIComponent(
    isCourierServiceKind(kind)
      ? `Hello${greeting}, this is Auto Galaxy. We need to send a faulty battery or move goods. Please arrange pickup.`
      : `Hello${greeting}, this is Auto Galaxy. We would like to place an order.`,
  );
  return `https://wa.me/${withCountry}?text=${text}`;
}
