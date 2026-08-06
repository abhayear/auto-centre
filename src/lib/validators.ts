import { z } from "zod";

export function formatZodErrors(error: z.ZodError) {
  return error.issues.map((issue) => ({
    field: issue.path.join("."),
    message: issue.message,
  }));
}

export const uploadedImageUrlSchema = z
  .string()
  .max(2048)
  .refine(
    (value) =>
      value.startsWith("/uploads/") ||
      value.startsWith("/images/") ||
      value.startsWith("https://") ||
      value.startsWith("http://"),
    "Must be an uploaded image or valid URL",
  );

export const optionalUploadedImageUrlSchema = uploadedImageUrlSchema.optional().nullable();

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
  images: z
    .array(uploadedImageUrlSchema)
    .min(1, "Upload at least one vehicle photo")
    .max(10)
    .default([]),
  description: z.string().min(10, "Description must be at least 10 characters"),
  featured: z.boolean().default(false),
  visitorBookingReward: z.preprocess(
    (val) => (val === "" || val === null || val === undefined ? null : val),
    z.coerce
      .number()
      .nonnegative("Reward must be zero or positive")
      .nullable()
      .optional(),
  ),
});

export function resolveVisitorBookingReward(
  type: string,
  vehicleId: string | undefined | null,
  visitorBookingReward: number | null | undefined,
): number | null {
  if (type !== "test_drive" || !vehicleId) return null;
  if (visitorBookingReward == null || visitorBookingReward <= 0) return null;
  return visitorBookingReward;
}

export const serviceSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  estimatedPrice: z.coerce.number().positive("Price must be positive"),
  durationMinutes: z.coerce.number().int().positive(),
  imageUrl: optionalUploadedImageUrlSchema,
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

export const esteemedCustomerSchema = z.object({
  name: z.string().min(2, "Customer name is required"),
  designation: z.string().max(120).optional(),
  locality: z.string().max(120).optional(),
  vehicle: z.string().max(120).optional(),
  note: z.string().max(300).optional(),
  photoUrl: optionalUploadedImageUrlSchema,
  sortOrder: z.coerce.number().int().min(0).default(0),
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

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z.string().min(8, "New password must be at least 8 characters"),
    confirmPassword: z.string().min(1, "Please confirm your new password"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  })
  .refine((data) => data.currentPassword !== data.newPassword, {
    message: "New password must be different from current password",
    path: ["newPassword"],
  });

export const createManagerSchema = z.object({
  email: z.string().email("Valid email is required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export const updateManagerSchema = z.object({
  id: z.string().min(1),
  active: z.boolean().optional(),
  password: z.string().min(8, "Password must be at least 8 characters").optional(),
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
    visitorCount: z.coerce.number().int().min(0),
    showVisitorCount: z.boolean(),
    heroImageUrl: optionalUploadedImageUrlSchema,
    logoUrl: optionalUploadedImageUrlSchema,
  })
  .refine(
    (data) => !data.noticeActive || Boolean(data.noticeText?.trim()),
    {
      message: "Notice text is required when notice is active",
      path: ["noticeText"],
    }
  );

export const serviceScheduleSchema = z.object({
  title: z.string().min(3, "Title is required").max(200),
  summary: z.string().max(500).nullable().optional(),
  content: z.string().min(20, "Content must be at least 20 characters"),
  published: z.boolean(),
});

export const webVitalsSchema = z.object({
  name: z.enum(["LCP", "INP", "CLS", "TTFB"]),
  value: z.number().finite().nonnegative(),
  rating: z.enum(["good", "needs-improvement", "poor"]),
  path: z.string().max(200).optional(),
});

export const cloudVitalsAdviseSchema = z.object({
  message: z.string().min(1).max(2000),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().max(4000),
      }),
    )
    .max(20)
    .optional(),
});

export const cashBoxEntrySchema = z.object({
  type: z.enum(["receipt", "payment"]),
  category: z.enum(["sale", "service", "advance", "expense", "other"]),
  business: z.enum(["ecomotive", "autogalaxy", "other"]).optional().nullable(),
  paymentMethod: z.enum(["cash", "phonepay", "other"]).optional().nullable(),
  description: z.string().min(1, "Description is required").max(200),
  amount: z.coerce.number().positive("Amount must be positive"),
  sortOrder: z.coerce.number().int().min(0).default(0),
});

export const cashBoxRecordSchema = z.object({
  recordDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD date"),
  sessionNumber: z.coerce.number().int().min(1).max(10).default(1),
  openingBalance: z.coerce.number().min(0),
  takenHome: z.coerce.number().min(0).default(0),
  notes: z.string().max(500).optional().nullable(),
  entries: z.array(cashBoxEntrySchema).default([]),
});

export const cashBoxRecordUpdateSchema = cashBoxRecordSchema.partial().extend({
  id: z.string().min(1),
});

export type VehicleInput = z.infer<typeof vehicleSchema>;
export type ServiceInput = z.infer<typeof serviceSchema>;
export type BookingInput = z.infer<typeof bookingSchema>;
export type InquiryInput = z.infer<typeof inquirySchema>;
