import { describe, expect, it } from "vitest";
import { assertOpsRole } from "@/lib/auth-guards";

describe("assertOpsRole", () => {
  it("allows admin and manager", () => {
    expect(assertOpsRole("admin")).toBe(true);
    expect(assertOpsRole("manager")).toBe(true);
  });

  it("rejects non-ops staff and unknown roles", () => {
    expect(assertOpsRole("sales")).toBe(false);
    expect(assertOpsRole("mechanic")).toBe(false);
    expect(assertOpsRole("senior_developer")).toBe(false);
    expect(assertOpsRole("junior_developer")).toBe(false);
    expect(assertOpsRole(undefined)).toBe(false);
    expect(assertOpsRole("")).toBe(false);
    expect(assertOpsRole("guest")).toBe(false);
  });
});
