import { describe, expect, it } from "vitest";
import {
  DEFAULT_WARRANTY_POLICY,
  componentWarranty,
  isWarrantyCovered,
  policyMonthsFor,
  warrantyEndDate,
  warrantyMonthsFor,
  warrantyStartDateFor,
  warrantyStatusOn,
} from "@/lib/component-warranty";

const bike = { saleDate: "2026-01-10", invoiceDate: "2026-01-08" };

describe("policy durations", () => {
  it("covers battery, motor, and controller for three years and charger for one", () => {
    expect(policyMonthsFor("battery")).toBe(36);
    expect(policyMonthsFor("motor")).toBe(36);
    expect(policyMonthsFor("controller")).toBe(36);
    expect(policyMonthsFor("charger")).toBe(12);
  });

  it("follows the dealer's edited policy instead of hard-coded years", () => {
    const policy = { ...DEFAULT_WARRANTY_POLICY, batteryMonths: 60 };
    expect(policyMonthsFor("battery", policy)).toBe(60);
    expect(warrantyMonthsFor({ componentType: "battery" }, policy)).toBe(60);
  });

  it("lets one component carry its own cover", () => {
    expect(warrantyMonthsFor({ componentType: "charger", warrantyMonths: 24 })).toBe(24);
  });
});

describe("warrantyEndDate", () => {
  it("adds calendar months", () => {
    expect(warrantyEndDate("2026-01-10", 36)).toBe("2029-01-10");
    expect(warrantyEndDate("2026-01-10", 12)).toBe("2027-01-10");
  });

  it("clamps to the length of the end month", () => {
    expect(warrantyEndDate("2026-01-31", 1)).toBe("2026-02-28");
  });

  it("returns nothing when the start or duration is missing", () => {
    expect(warrantyEndDate(null, 36)).toBeNull();
    expect(warrantyEndDate("2026-01-10", 0)).toBeNull();
  });
});

describe("warrantyStartDateFor", () => {
  it("uses the basis the dealer configured", () => {
    const dates = {
      saleDate: "2026-01-10",
      invoiceDate: "2026-01-08",
      installationDate: "2026-01-15",
      companyStartDate: "2026-01-01",
    };
    expect(warrantyStartDateFor("sale_date", dates)).toBe("2026-01-10");
    expect(warrantyStartDateFor("invoice_date", dates)).toBe("2026-01-08");
    expect(warrantyStartDateFor("installation_date", dates)).toBe("2026-01-15");
    expect(warrantyStartDateFor("company_start", dates)).toBe("2026-01-01");
  });

  it("falls back to the sale date when the chosen basis is not recorded", () => {
    expect(warrantyStartDateFor("installation_date", bike)).toBe("2026-01-10");
    expect(warrantyStartDateFor("company_start", { invoiceDate: "2026-01-08" })).toBe("2026-01-08");
    expect(warrantyStartDateFor("sale_date", {})).toBeNull();
  });
});

describe("warrantyStatusOn", () => {
  it("is active well inside the period and expired after it", () => {
    expect(warrantyStatusOn("2029-01-10", "2026-09-18")).toBe("active");
    expect(warrantyStatusOn("2027-01-10", "2027-02-20")).toBe("expired");
  });

  it("expires on the end date itself", () => {
    expect(warrantyStatusOn("2027-01-10", "2027-01-10")).toBe("expired");
  });

  it("warns inside the expiring window", () => {
    expect(warrantyStatusOn("2026-10-10", "2026-09-18")).toBe("expiring_soon");
    expect(warrantyStatusOn("2026-10-10", "2026-09-18", 7)).toBe("active");
  });

  it("says unknown when nothing was recorded", () => {
    expect(warrantyStatusOn(null, "2026-09-18")).toBe("unknown");
  });
});

describe("componentWarranty", () => {
  it("works out the battery on a bike sold in January", () => {
    const result = componentWarranty({ componentType: "battery" }, bike, "2026-09-18");
    expect(result.startDate).toBe("2026-01-10");
    expect(result.months).toBe(36);
    expect(result.endDate).toBe("2029-01-10");
    expect(result.status).toBe("active");
    expect(isWarrantyCovered(result)).toBe(true);
  });

  it("gives the charger on that same bike a different end date", () => {
    const charger = componentWarranty({ componentType: "charger" }, bike, "2026-11-18");
    expect(charger.endDate).toBe("2027-01-10");
    expect(charger.status).toBe("active");

    const later = componentWarranty({ componentType: "charger" }, bike, "2027-02-20");
    expect(later.status).toBe("expired");
    expect(isWarrantyCovered(later)).toBe(false);
  });

  it("starts a replacement component's own cover from its fitted date", () => {
    const result = componentWarranty(
      { componentType: "battery", warrantyStartDate: "2026-10-18", warrantyMonths: 12 },
      bike,
      "2027-06-01",
    );
    expect(result.startDate).toBe("2026-10-18");
    expect(result.endDate).toBe("2027-10-18");
    expect(result.status).toBe("active");
  });

  it("respects a per-bike basis override", () => {
    const result = componentWarranty(
      { componentType: "battery" },
      { ...bike, installationDate: "2026-02-01", warrantyStartBasis: "installation_date" },
      "2026-09-18",
    );
    expect(result.startDate).toBe("2026-02-01");
    expect(result.endDate).toBe("2029-02-01");
  });

  it("reports unknown rather than guessing when no dates exist", () => {
    const result = componentWarranty({ componentType: "battery" }, {}, "2026-09-18");
    expect(result.status).toBe("unknown");
    expect(result.endDate).toBeNull();
    expect(result.daysRemaining).toBeNull();
  });
});
