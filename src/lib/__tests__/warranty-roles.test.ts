import { describe, expect, it } from "vitest";
import {
  WARRANTY_ROLES,
  canViewAllWarrantyCases,
  canWarrantyAction,
  isWarrantyReadOnly,
  requiresWarrantyReason,
  warrantyLevel,
  warrantyRoleForStaffRole,
} from "@/lib/warranty-roles";

describe("warranty authority matrix", () => {
  it("gives the owner every action", () => {
    expect(canWarrantyAction("owner", "change_warranty_period")).toBe(true);
    expect(canWarrantyAction("owner", "manage_users")).toBe(true);
    expect(canWarrantyAction("owner", "close_claim")).toBe(true);
    expect(warrantyLevel("owner")).toBe(5);
  });

  it("lets the warranty manager run operations but not master settings", () => {
    expect(canWarrantyAction("warranty_manager", "approve_claim")).toBe(true);
    expect(canWarrantyAction("warranty_manager", "close_claim")).toBe(true);
    expect(canWarrantyAction("warranty_manager", "resolve_exceptions")).toBe(true);
    expect(canWarrantyAction("warranty_manager", "change_warranty_period")).toBe(false);
    expect(canWarrantyAction("warranty_manager", "manage_users")).toBe(false);
    expect(warrantyLevel("warranty_manager")).toBe(4);
  });

  it("keeps executives inside their own operational action", () => {
    expect(canWarrantyAction("intake", "create_claim")).toBe(true);
    expect(canWarrantyAction("intake", "approve_claim")).toBe(false);
    expect(canWarrantyAction("intake", "close_claim")).toBe(false);
    expect(canWarrantyAction("dispatch", "dispatch")).toBe(true);
    expect(canWarrantyAction("dispatch", "receive")).toBe(false);
    expect(canWarrantyAction("technician", "install_code")).toBe(true);
    expect(canWarrantyAction("technician", "create_claim")).toBe(false);
    expect(canWarrantyAction("accounts", "upload_documents")).toBe(true);
    expect(canWarrantyAction("accounts", "install_code")).toBe(false);
  });

  it("keeps the auditor read-only", () => {
    expect(isWarrantyReadOnly("auditor")).toBe(true);
    expect(canWarrantyAction("auditor", "create_claim")).toBe(false);
    expect(canViewAllWarrantyCases("auditor")).toBe(true);
  });

  it("only lets supervisors see every case", () => {
    expect(canViewAllWarrantyCases("owner")).toBe(true);
    expect(canViewAllWarrantyCases("warranty_manager")).toBe(true);
    expect(canViewAllWarrantyCases("dispatch")).toBe(false);
    expect(canViewAllWarrantyCases("technician")).toBe(false);
  });

  it("requires a reason for decisions that rewrite history", () => {
    expect(requiresWarrantyReason("close_claim")).toBe(true);
    expect(requiresWarrantyReason("correct_records")).toBe(true);
    expect(requiresWarrantyReason("dispatch")).toBe(false);
  });

  it("gives every role a level between view and admin", () => {
    for (const role of WARRANTY_ROLES) {
      const level = warrantyLevel(role);
      expect(level).toBeGreaterThanOrEqual(1);
      expect(level).toBeLessThanOrEqual(5);
    }
  });
});

describe("warrantyRoleForStaffRole", () => {
  it("maps staff roles onto warranty roles", () => {
    expect(warrantyRoleForStaffRole("admin")).toBe("owner");
    expect(warrantyRoleForStaffRole("manager")).toBe("warranty_manager");
    expect(warrantyRoleForStaffRole("purchasing")).toBe("dispatch");
    expect(warrantyRoleForStaffRole("store")).toBe("receiving");
    expect(warrantyRoleForStaffRole("mechanic")).toBe("technician");
    expect(warrantyRoleForStaffRole("sales")).toBe("support");
  });

  it("leaves developers outside the warranty flow", () => {
    expect(warrantyRoleForStaffRole("senior_developer")).toBeNull();
    expect(warrantyRoleForStaffRole("junior_developer")).toBeNull();
  });
});
