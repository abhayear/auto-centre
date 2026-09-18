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

  it.each([
    ["purchasing", "/admin/inventory/receive"],
    ["store", "/admin/inventory/issue"],
  ] as const)("maps %s to its inventory home", (role, expected) => {
    expect(homeRedirectForRole(role)).toBe(expected);
  });
});

describe("assertStaffPageAccess", () => {
  it.each(["admin", "manager"] as const)(
    "allows %s to access offers and pricing",
    (role) => {
      expect(assertStaffPageAccess("/admin/offers", role)).toBeNull();
    },
  );

  it.each(["admin", "manager"] as const)(
    "allows %s to access replacement parts",
    (role) => {
      expect(assertStaffPageAccess("/admin/replacement-parts", role)).toBeNull();
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

  it("allows admin and manager to access staff management", () => {
    expect(assertStaffPageAccess("/admin/staff", "admin")).toBeNull();
    expect(assertStaffPageAccess("/admin/staff", "manager")).toBeNull();
    expect(assertStaffPageAccess("/admin/staff", "purchasing")).toBe(
      "/admin/inventory/receive",
    );
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

  it("allows purchasing on receive and blocks issue and vehicles", () => {
    expect(assertStaffPageAccess("/admin/inventory/receive", "purchasing")).toBeNull();
    expect(assertStaffPageAccess("/admin/inventory/issue", "purchasing")).toBe(
      "/admin/inventory/receive",
    );
    expect(assertStaffPageAccess("/admin/vehicles", "purchasing")).toBe(
      "/admin/inventory/receive",
    );
  });

  it("allows store on issue and audit and blocks portals", () => {
    expect(assertStaffPageAccess("/admin/inventory/issue", "store")).toBeNull();
    expect(assertStaffPageAccess("/admin/inventory/audit", "store")).toBeNull();
    expect(assertStaffPageAccess("/admin/inventory/portals", "store")).toBe(
      "/admin/inventory/issue",
    );
    expect(assertStaffPageAccess("/admin/inventory/couriers", "store")).toBeNull();
    expect(assertStaffPageAccess("/admin/inventory/couriers", "purchasing")).toBeNull();
  });

  it("allows manager on all inventory pages", () => {
    expect(assertStaffPageAccess("/admin/inventory/portals", "manager")).toBeNull();
    expect(assertStaffPageAccess("/admin/inventory/couriers", "manager")).toBeNull();
    expect(assertStaffPageAccess("/admin/inventory/receive", "manager")).toBeNull();
    expect(assertStaffPageAccess("/admin/inventory/issue", "manager")).toBeNull();
    expect(assertStaffPageAccess("/admin/inventory/audit", "manager")).toBeNull();
  });

  it("opens the warranty board to its queue owners only", () => {
    expect(assertStaffPageAccess("/admin/warranty", "manager")).toBeNull();
    expect(assertStaffPageAccess("/admin/warranty", "admin")).toBeNull();
    expect(assertStaffPageAccess("/admin/warranty", "purchasing")).toBeNull();
    expect(assertStaffPageAccess("/admin/warranty", "store")).toBeNull();
    expect(assertStaffPageAccess("/admin/warranty", "mechanic")).toBeNull();
    expect(assertStaffPageAccess("/admin/warranty", "sales")).toBe("/admin/training");
    expect(assertStaffPageAccess("/admin/warranty", "junior_developer")).toBe("/admin/work");
  });
});
