import { describe, expect, it } from "vitest";
import { canEditCashBox } from "@/lib/admin-roles";

describe("canEditCashBox", () => {
  it("allows admin to edit and delete", () => {
    expect(canEditCashBox("admin")).toBe(true);
  });

  it("restricts managers to add-only", () => {
    expect(canEditCashBox("manager")).toBe(false);
  });
});
