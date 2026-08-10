import { describe, expect, it } from "vitest";
import { resolveOnlineBookingRefund, vehicleSchema } from "../validators";

describe("vehicleSchema onlineBookingRefund", () => {
  const baseVehicle = {
    make: "Ola",
    model: "S1 Pro",
    year: 2024,
    price: 120000,
    mileage: 0,
    fuelType: "Electric" as const,
    transmission: "Automatic" as const,
    condition: "new" as const,
    status: "available" as const,
    images: ["/uploads/vehicles/test.jpg"],
    description: "Popular electric scooter with great range.",
    featured: false,
  };

  it("accepts a positive online booking refund", () => {
    const result = vehicleSchema.safeParse({
      ...baseVehicle,
      onlineBookingRefund: 500,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.onlineBookingRefund).toBe(500);
    }
  });

  it("accepts zero refund", () => {
    const result = vehicleSchema.safeParse({
      ...baseVehicle,
      onlineBookingRefund: 0,
    });
    expect(result.success).toBe(true);
  });

  it("accepts null refund", () => {
    const result = vehicleSchema.safeParse({
      ...baseVehicle,
      onlineBookingRefund: null,
    });
    expect(result.success).toBe(true);
  });

  it("coerces empty string to null", () => {
    const result = vehicleSchema.safeParse({
      ...baseVehicle,
      onlineBookingRefund: "",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.onlineBookingRefund).toBeNull();
    }
  });

  it("rejects negative refund", () => {
    const result = vehicleSchema.safeParse({
      ...baseVehicle,
      onlineBookingRefund: -100,
    });
    expect(result.success).toBe(false);
  });
});

describe("resolveOnlineBookingRefund", () => {
  it("returns refund for test drive with vehicle and positive amount", () => {
    expect(resolveOnlineBookingRefund("test_drive", "vehicle-1", 750)).toBe(750);
  });

  it("returns null for non test drive inquiries", () => {
    expect(resolveOnlineBookingRefund("contact", "vehicle-1", 750)).toBeNull();
  });

  it("returns null without vehicle id", () => {
    expect(resolveOnlineBookingRefund("test_drive", null, 750)).toBeNull();
  });

  it("returns null when refund is missing", () => {
    expect(resolveOnlineBookingRefund("test_drive", "vehicle-1", null)).toBeNull();
  });

  it("returns null when refund is zero", () => {
    expect(resolveOnlineBookingRefund("test_drive", "vehicle-1", 0)).toBeNull();
  });
});
