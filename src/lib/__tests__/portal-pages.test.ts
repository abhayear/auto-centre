import { describe, expect, it } from "vitest";
import {
  assertStaffPageAccess,
  homeRedirectForRole,
} from "@/lib/portal-pages";

describe("homeRedirectForRole", () => {
  it.each([
    ["admin", null],
    ["manager", null],
    ["senior_developer", "/admin/releases"],
    ["junior_developer", "/admin/work"],
    ["sales", "/admin/training"],
    ["mechanic", "/admin/training"],
  ] as const)("maps %s to its portal home", (role, expected) => {
    expect(homeRedirectForRole(role)).toBe(expected);
  });
});

describe("assertStaffPageAccess", () => {
  it.each(["admin", "manager"] as const)(
    "allows %s to access operations pages",
    (role) => {
      expect(assertStaffPageAccess("/admin/vehicles", role)).toBeNull();
    },
  );

  it.each([
    ["sales", "/admin/training"],
    ["mechanic", "/admin/training"],
    ["senior_developer", "/admin/releases"],
    ["junior_developer", "/admin/work"],
  ] as const)("redirects %s away from operations pages", (role, expected) => {
    expect(assertStaffPageAccess("/admin/vehicles/123", role)).toBe(expected);
  });

  it.each(["admin", "manager", "sales", "mechanic"] as const)(
    "allows %s to access training",
    (role) => {
      expect(assertStaffPageAccess("/admin/training", role)).toBeNull();
    },
  );

  it("sends developers from training to their dashboard destination", () => {
    expect(
      assertStaffPageAccess("/admin/training", "senior_developer"),
    ).toBe("/admin/releases");
    expect(
      assertStaffPageAccess("/admin/training", "junior_developer"),
    ).toBe("/admin/work");
  });

  it.each(["admin", "senior_developer", "junior_developer"] as const)(
    "allows %s to access work",
    (role) => {
      expect(assertStaffPageAccess("/admin/work", role)).toBeNull();
    },
  );

  it.each(["admin", "senior_developer", "junior_developer"] as const)(
    "allows %s to access releases",
    (role) => {
      expect(assertStaffPageAccess("/admin/releases", role)).toBeNull();
    },
  );

  it("allows only admins to access staff management", () => {
    expect(assertStaffPageAccess("/admin/staff", "admin")).toBeNull();
    expect(assertStaffPageAccess("/admin/staff", "manager")).toBe("/admin");
  });

  it("allows every staff role to change their password", () => {
    expect(
      assertStaffPageAccess("/admin/change-password", "mechanic"),
    ).toBeNull();
  });

  it("leaves dashboard redirects to the dashboard page", () => {
    expect(assertStaffPageAccess("/admin", "sales")).toBeNull();
  });

  it.each([
    ["sales", "/admin/training"],
    ["mechanic", "/admin/training"],
  ] as const)(
    "redirects %s when pathname header is missing or empty",
    (role, expected) => {
      for (const pathname of [null, undefined, ""]) {
        expect(assertStaffPageAccess(pathname, role)).toBe(expected);
      }
    },
  );

  it.each(["admin", "manager"] as const)(
    "allows %s when pathname header is missing or empty",
    (role) => {
      for (const pathname of [null, undefined, ""]) {
        expect(assertStaffPageAccess(pathname, role)).toBeNull();
      }
    },
  );
});
