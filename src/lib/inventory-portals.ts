export const SEED_BUYING_PORTALS: { name: string; websiteUrl: string }[] = [
  { name: "Elyf EV Spare", websiteUrl: "https://example.com/elyf" },
  { name: "Vishal Bearing House", websiteUrl: "https://example.com/vishal-bearing-house" },
  { name: "Maple", websiteUrl: "https://example.com/maple" },
  { name: "Komaki", websiteUrl: "https://example.com/komaki" },
  { name: "E Indiabull", websiteUrl: "https://example.com/e-indiabull" },
  { name: "R K Enterprises", websiteUrl: "https://example.com/rk-enterprises" },
];

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
}): PublicBuyingPortal {
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
  };
}
