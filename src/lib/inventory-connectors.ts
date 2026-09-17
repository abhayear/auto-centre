export const NO_CONNECTOR_ERROR = "No connector; use manual receive.";

export type BuyingConnectorCreds = {
  websiteUrl: string;
  username: string;
  password: string;
};

export type BuyingConnectorBillLine = {
  vendorSku: string;
  vendorName: string;
  qty: number;
  purchaseRate: number;
};

export type BuyingConnectorBill = {
  billNumber: string;
  billDate: string;
  lines: BuyingConnectorBillLine[];
};

export type BuyingConnectorCatalogLine = {
  vendorSku: string;
  vendorName: string;
  livePurchaseRate: number;
};

export type BuyingConnector = {
  id: string;
  fetchBills: (creds: BuyingConnectorCreds) => Promise<BuyingConnectorBill[]>;
  fetchCatalog: (creds: BuyingConnectorCreds) => Promise<BuyingConnectorCatalogLine[]>;
};

const REGISTRY: Record<string, BuyingConnector> = {};

export function getBuyingConnector(
  connectorId: string | null | undefined,
): BuyingConnector | null {
  if (!connectorId) return null;
  return REGISTRY[connectorId] ?? null;
}
