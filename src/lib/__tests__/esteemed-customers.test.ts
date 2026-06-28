import { describe, expect, it } from "vitest";
import { esteemedCustomerSchema } from "@/lib/validators";

describe("esteemedCustomerSchema", () => {
  it("accepts valid customer data", () => {
    const result = esteemedCustomerSchema.safeParse({
      name: "Rajesh Kumar",
      designation: "Shopkeeper",
      locality: "Lalitpur",
      vehicle: "Ola S1 Air",
      note: "Loyal customer",
      sortOrder: 1,
      active: true,
    });
    expect(result.success).toBe(true);
  });

  it("requires a name", () => {
    const result = esteemedCustomerSchema.safeParse({
      name: "R",
      active: true,
    });
    expect(result.success).toBe(false);
  });
});
