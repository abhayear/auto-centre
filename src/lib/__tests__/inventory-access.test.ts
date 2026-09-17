import { describe, expect, it } from "vitest";
import {
  canAuditInventory,
  canIssueInventory,
  canManageBuyingPortals,
  canReceiveInventory,
  canWriteInventoryRates,
  inventoryHomeForRole,
} from "@/lib/inventory-access";

describe("inventory access", () => {
  it("lets admin and manager manage portals and rates", () => {
    expect(canManageBuyingPortals("admin")).toBe(true);
    expect(canManageBuyingPortals("manager")).toBe(true);
    expect(canManageBuyingPortals("purchasing")).toBe(false);
    expect(canWriteInventoryRates("store")).toBe(false);
    expect(canWriteInventoryRates("manager")).toBe(true);
  });

  it("splits receive vs issue/audit", () => {
    expect(canReceiveInventory("purchasing")).toBe(true);
    expect(canReceiveInventory("store")).toBe(false);
    expect(canIssueInventory("store")).toBe(true);
    expect(canIssueInventory("purchasing")).toBe(false);
    expect(canAuditInventory("store")).toBe(true);
    expect(canAuditInventory("purchasing")).toBe(false);
    expect(canReceiveInventory("manager")).toBe(true);
    expect(canIssueInventory("admin")).toBe(true);
  });

  it("homes purchasing on receive and store on issue", () => {
    expect(inventoryHomeForRole("purchasing")).toBe("/admin/inventory/receive");
    expect(inventoryHomeForRole("store")).toBe("/admin/inventory/issue");
    expect(inventoryHomeForRole("manager")).toBeNull();
  });
});
