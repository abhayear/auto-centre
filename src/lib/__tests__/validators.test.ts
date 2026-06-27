import { describe, expect, it } from "vitest";
import {
  bookingSchema,
  bookingStatusSchema,
  inquirySchema,
  inquiryStatusSchema,
  jobApplicationSchema,
  jobPostingSchema,
  loginSchema,
  serviceSchema,
  vehicleSchema,
} from "../validators";

describe("vehicleSchema", () => {
  const validVehicle = {
    make: "Toyota",
    model: "Camry",
    year: 2024,
    price: 28900,
    mileage: 12000,
    fuelType: "Hybrid" as const,
    transmission: "Automatic" as const,
    condition: "used" as const,
    status: "available" as const,
    images: ["https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=800"],
    description: "Well maintained sedan with full service history.",
    featured: false,
  };

  it("accepts valid vehicle input", () => {
    const result = vehicleSchema.safeParse(validVehicle);
    expect(result.success).toBe(true);
  });

  it("rejects missing make", () => {
    const { make, ...rest } = validVehicle;
    void make;
    const result = vehicleSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it("rejects negative price", () => {
    const result = vehicleSchema.safeParse({ ...validVehicle, price: -100 });
    expect(result.success).toBe(false);
  });

  it("rejects invalid fuel type", () => {
    const result = vehicleSchema.safeParse({ ...validVehicle, fuelType: "Nuclear" });
    expect(result.success).toBe(false);
  });
});

describe("serviceSchema", () => {
  it("accepts valid service input", () => {
    const result = serviceSchema.safeParse({
      name: "Oil Change",
      description: "Full synthetic oil change with filter replacement.",
      estimatedPrice: 79,
      durationMinutes: 45,
      active: true,
    });
    expect(result.success).toBe(true);
  });
});

describe("bookingSchema", () => {
  it("accepts valid booking input", () => {
    const result = bookingSchema.safeParse({
      customerName: "Jane Doe",
      email: "jane@example.com",
      phone: "555-123-4567",
      customerArea: "Lalitpur",
      vehicleInfo: "Toyota Camry 2020",
      serviceId: "clxyz123",
      preferredDate: "2026-07-01",
      preferredTime: "10:00",
      notes: "Please call before arrival.",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid email", () => {
    const result = bookingSchema.safeParse({
      customerName: "Jane Doe",
      email: "not-an-email",
      phone: "555-123-4567",
      vehicleInfo: "Toyota Camry 2020",
      serviceId: "clxyz123",
      preferredDate: "2026-07-01",
      preferredTime: "10:00",
    });
    expect(result.success).toBe(false);
  });
});

describe("inquirySchema", () => {
  it("accepts test drive inquiry", () => {
    const result = inquirySchema.safeParse({
      type: "test_drive",
      name: "John Smith",
      email: "john@example.com",
      message: "I would like to schedule a test drive this weekend.",
      vehicleId: "vehicle-123",
    });
    expect(result.success).toBe(true);
  });

  it("rejects short message", () => {
    const result = inquirySchema.safeParse({
      type: "contact",
      name: "John Smith",
      email: "john@example.com",
      message: "Hi",
    });
    expect(result.success).toBe(false);
  });
});

describe("loginSchema", () => {
  it("accepts valid credentials", () => {
    const result = loginSchema.safeParse({
      email: "admin@autocentre.com",
      password: "secret",
    });
    expect(result.success).toBe(true);
  });
});

describe("status schemas", () => {
  it("accepts valid booking statuses", () => {
    for (const status of ["pending", "confirmed", "completed", "cancelled"]) {
      expect(bookingStatusSchema.safeParse({ status }).success).toBe(true);
    }
  });

  it("accepts valid inquiry statuses", () => {
    for (const status of ["new", "replied", "closed"]) {
      expect(inquiryStatusSchema.safeParse({ status }).success).toBe(true);
    }
  });
});

describe("jobPostingSchema", () => {
  it("accepts valid job posting", () => {
    const result = jobPostingSchema.safeParse({
      title: "Sales Consultant",
      department: "Sales",
      location: "Auto City",
      employmentType: "full_time",
      description: "Help customers find their ideal vehicle in a fast-paced showroom environment.",
      requirements: "Sales experience and valid driver's license required.",
      salaryRange: "$45,000 - $55,000",
      status: "open",
      active: true,
    });
    expect(result.success).toBe(true);
  });
});

describe("jobApplicationSchema", () => {
  it("accepts valid job application", () => {
    const result = jobApplicationSchema.safeParse({
      jobId: "job-123",
      name: "Jane Doe",
      email: "jane@example.com",
      coverLetter: "I am excited to apply for this role.",
    });
    expect(result.success).toBe(true);
  });
});
