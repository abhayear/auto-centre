import { describe, expect, it } from "vitest";
import { routeGroupFromPath, statusClassFromStatus } from "@/lib/health/route-group";

describe("routeGroupFromPath", () => {
  it("maps pages to / and APIs to the first two segments", () => {
    expect(routeGroupFromPath("/")).toBe("/");
    expect(routeGroupFromPath("/vehicles/abc")).toBe("/");
    expect(routeGroupFromPath("/api/bookings")).toBe("/api/bookings");
    expect(routeGroupFromPath("/api/bookings/xyz")).toBe("/api/bookings");
    expect(routeGroupFromPath("/api/health")).toBe("/api/health");
  });
});

describe("statusClassFromStatus", () => {
  it("buckets 2xx 4xx 5xx", () => {
    expect(statusClassFromStatus(200)).toBe("2xx");
    expect(statusClassFromStatus(404)).toBe("4xx");
    expect(statusClassFromStatus(503)).toBe("5xx");
  });
});
