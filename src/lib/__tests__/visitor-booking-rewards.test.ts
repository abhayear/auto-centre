import { describe, expect, it } from "vitest";
import { resolveVisitorBookingReward, vehicleSchema } from "../validators";

describe("vehicleSchema visitorBookingReward", () => {
  const baseVehicle = {
    make: "Hero",
    model: "Electric Pro",
    year: 2025,
    price: 85000,
    mileage: 0,
    fuelType: "Electric" as const,
    transmission: "Automatic" as const,
    condition: "new" as const,
    status: "available" as const,
    images: ["/uploads/vehicles/hero.jpg"],
    description: "Premium e-bike with long range battery.",
    featured: true,
  };

  it("accepts a positive visitor booking reward", () => {
    const result = vehicleSchema.safeParse({
      ...baseVehicle,
      visitorBookingReward: 500,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.visitorBookingReward).toBe(500);
    }
  });

  it("accepts zero reward", () => {
    const result = vehicleSchema.safeParse({
      ...baseVehicle,
      visitorBookingReward: 0,
    });
    expect(result.success).toBe(true);
  });

  it("accepts null reward", () => {
    const result = vehicleSchema.safeParse({
      ...baseVehicle,
      visitorBookingReward: null,
    });
    expect(result.success).toBe(true);
  });

  it("coerces empty string to null", () => {
    const result = vehicleSchema.safeParse({
      ...baseVehicle,
      visitorBookingReward: "",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.visitorBookingReward).toBeNull();
    }
  });

  it("rejects negative reward", () => {
    const result = vehicleSchema.safeParse({
      ...baseVehicle,
      visitorBookingReward: -100,
    });
    expect(result.success).toBe(false);
  });
});

describe("resolveVisitorBookingReward", () => {
  it("returns reward for test drive with positive vehicle reward", () => {
    expect(resolveVisitorBookingReward("test_drive", "vehicle-1", 750)).toBe(750);
  });

  it("returns null for non test drive inquiries", () => {
    expect(resolveVisitorBookingReward("contact", "vehicle-1", 750)).toBeNull();
  });

  it("returns null when vehicleId is missing", () => {
    expect(resolveVisitorBookingReward("test_drive", null, 750)).toBeNull();
  });

  it("returns null when vehicle reward is null", () => {
    expect(resolveVisitorBookingReward("test_drive", "vehicle-1", null)).toBeNull();
  });

  it("returns null when vehicle reward is zero", () => {
    expect(resolveVisitorBookingReward("test_drive", "vehicle-1", 0)).toBeNull();
  });
});
