import { describe, expect, it } from "vitest";
import { getBuyingConnector } from "@/lib/inventory-connectors";

describe("getBuyingConnector", () => {
  it("returns null in v1 for named and missing ids", () => {
    expect(getBuyingConnector("elyf")).toBeNull();
    expect(getBuyingConnector(null)).toBeNull();
    expect(getBuyingConnector(undefined)).toBeNull();
  });
});
