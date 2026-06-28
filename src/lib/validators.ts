import { z } from "zod";

export function formatZodErrors(error: z.ZodError) {
  return error.issues.map((issue) => ({
    field: issue.path.join("."),
    message: issue.message,
  }));
}

export const vehicleSchema = z.object({
  make: z.string().min(1, "Make is required"),
  model: z.string().min(1, "Model is required"),
  year: z.coerce.number().int().min(1900).max(new Date().getFullYear() + 1),
  price: z.coerce.number().positive("Price must be positive"),
  mileage: z.coerce.number().int().min(0),
  fuelType: z.enum(["Petrol", "Diesel", "Electric", "Hybrid", "Plug-in Hybrid"]),
  transmission: z.enum(["Automatic", "Manual", "CVT"]),
  condition: z.enum(["new", "used"]),
  status: z.enum(["available", "sold", "reserved"]).default("available"),
  images: z.array(z.string().url()).default([]),
  description: z.string().min(10, "Description must be at least 10 characters"),
  featured: z.boolean().default(false),
});

export const serviceSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  estimatedPrice: z.coerce.number().positive("Price must be positive"),
  durationMinutes: z.coerce.number().int().positive(),
  active: z.boolean().default(true),
});

export const bookingSchema = z.object({
  customerName: z.string().min(2, "Name is required"),
  email: z.string().email("Valid email is required"),
  phone: z.string().min(7, "Phone number is required"),
  customerArea: z.string().min(2, "Area or locality is required"),
  customerAddress: z.string().optional(),
  locality: z.string().optional(),
  sublocality: z.string().optional(),
  postalCode: z.string().optional(),
  latitude: z.coerce.number().optional(),
  longitude: z.coerce.number().optional(),
  vehicleInfo: z.string().min(2, "Vehicle info is required"),
  serviceId: z.string().min(1, "Please select a service"),
  preferredDate: z.string().min(1, "Preferred date is required"),
  preferredTime: z.string().min(1, "Preferred time is required"),
  notes: z.string().optional(),
});

export const serviceAreaCheckSchema = z
  .object({
    area: z.string().optional(),
    locality: z.string().optional(),
    sublocality: z.string().optional(),
    postalCode: z.string().optional(),
    formattedAddress: z.string().optional(),
    adminArea: z.string().optional(),
    lat: z.coerce.number().optional(),
    lng: z.coerce.number().optional(),
  })
  .refine(
    (data) =>
      Boolean(
        data.area?.trim() ||
          data.locality?.trim() ||
          data.sublocality?.trim() ||
          data.postalCode?.trim() ||
          data.formattedAddress?.trim()
      ),
    { message: "Enter your area or select a location on the map" }
  );

export const serviceAreaSchema = z.object({
  name: z.string().min(2, "Area name is required"),
  pinCode: z.string().optional(),
  active: z.boolean().default(true),
});

export const inquirySchema = z.object({
  type: z.enum(["test_drive", "contact", "general"]),
  name: z.string().min(2, "Name is required"),
  email: z.string().email("Valid email is required"),
  phone: z.string().optional(),
  message: z.string().min(10, "Message must be at least 10 characters"),
  vehicleId: z.string().optional(),
});

export const loginSchema = z.object({
  email: z.string().email("Valid email is required"),
  password: z.string().min(1, "Password is required"),
});

export const bookingStatusSchema = z.object({
  status: z.enum(["pending", "confirmed", "completed", "cancelled"]),
});

export const inquiryStatusSchema = z.object({
  status: z.enum(["new", "replied", "closed"]),
});

export const jobPostingSchema = z.object({
  title: z.string().min(1, "Title is required"),
  department: z.string().min(1, "Department is required"),
  location: z.string().min(1, "Location is required"),
  employmentType: z.enum(["full_time", "part_time", "contract"]),
  description: z.string().min(20, "Description must be at least 20 characters"),
  requirements: z.string().min(10, "Requirements must be at least 10 characters"),
  salaryRange: z.string().optional(),
  status: z.enum(["open", "closed"]).default("open"),
  active: z.boolean().default(true),
});

export const jobApplicationSchema = z.object({
  jobId: z.string().min(1, "Job is required"),
  name: z.string().min(2, "Name is required"),
  email: z.string().email("Valid email is required"),
  phone: z.string().optional(),
  resumeUrl: z.string().optional(),
  coverLetter: z.string().optional(),
});

export const jobApplicationStatusSchema = z.object({
  status: z.enum(["new", "reviewing", "interviewed", "rejected", "hired"]),
});

export const businessHourSchema = z.object({
  day: z.string().min(1, "Day label is required"),
  hours: z.string().min(1, "Hours are required"),
});

export const siteSettingsSchema = z
  .object({
    businessHours: z.array(businessHourSchema).min(1, "Add at least one timing row"),
    noticeText: z.string().max(500).nullable().optional(),
    noticeActive: z.boolean(),
  })
  .refine(
    (data) => !data.noticeActive || Boolean(data.noticeText?.trim()),
    {
      message: "Notice text is required when notice is active",
      path: ["noticeText"],
    }
  );

export type VehicleInput = z.infer<typeof vehicleSchema>;
export type ServiceInput = z.infer<typeof serviceSchema>;
export type BookingInput = z.infer<typeof bookingSchema>;
export type InquiryInput = z.infer<typeof inquirySchema>;
