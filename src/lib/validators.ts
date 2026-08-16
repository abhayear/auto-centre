import { z } from "zod";
import {
  REPLACEMENT_ITEM_SIDES,
  REPLACEMENT_ITEM_TYPES,
  REPLACEMENT_STATUSES,
  REPLACEMENT_VOLTAGES,
} from "@/lib/replacement-parts";
import { SHOWROOM_PAYMENT_MODES } from "@/lib/showroom-walk-ins";

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
  onlineBookingRefund: z.preprocess(
    (val) => (val === "" || val === null || val === undefined ? null : val),
    z.coerce
      .number()
      .nonnegative("Refund must be zero or positive")
      .nullable()
      .optional(),
  ),
  onlineBookingAmount: z.preprocess(
    (val) => (val === "" || val === null || val === undefined ? null : val),
    z.coerce
      .number()
      .nonnegative("Booking amount must be zero or positive")
      .nullable()
      .optional(),
  ),
});

export function resolveOnlineBookingRefund(
  type: string,
  vehicleId: string | undefined | null,
  onlineBookingRefund: number | null | undefined,
): number | null {
  if (type !== "test_drive" || !vehicleId) return null;
  if (onlineBookingRefund == null || onlineBookingRefund <= 0) return null;
  return onlineBookingRefund;
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

export const whatsappOtpSendSchema = z.object({
  phone: z.string().trim().min(10, "Enter a valid phone number"),
  name: z.string().trim().min(2, "Name is required").optional(),
});

export const whatsappOtpConfirmSchema = z.object({
  phone: z.string().trim().min(10, "Enter a valid phone number"),
  code: z.string().trim().length(6, "Enter the 6-digit code"),
  name: z.string().trim().min(2, "Name is required"),
  email: z.string().trim().email("Valid email is required").optional().or(z.literal("")),
});

export const inquirySchema = z
  .object({
    type: z.enum(["test_drive", "contact", "general"]),
    name: z.string().trim().min(2, "Name is required"),
    email: z.string().trim().email("Valid email is required"),
    phone: z.string().trim().optional(),
    message: z.string().trim().min(10, "Please enter at least 10 characters in notes"),
    vehicleId: z.string().trim().optional(),
    razorpay_order_id: z.string().trim().optional(),
    razorpay_payment_id: z.string().trim().optional(),
    razorpay_signature: z.string().trim().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.type === "test_drive") {
      if (!data.phone || data.phone.length < 7) {
        ctx.addIssue({
          code: "custom",
          path: ["phone"],
          message: "Phone number must be at least 7 digits",
        });
      }
    }
  });

export const bookingOrderSchema = z.object({
  vehicleId: z.string().trim().min(1, "Vehicle is required"),
  name: z.string().trim().min(2, "Name is required"),
  email: z.string().trim().email("Valid email is required"),
  phone: z.string().trim().min(7, "Phone number must be at least 7 digits"),
  message: z.string().trim().min(10, "Please enter at least 10 characters in notes"),
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
  roleTemplate: z
    .enum(["general", "ev_mechanic", "sales_executive", "service_advisor", "store_incharge"])
    .default("general"),
});

export const jobApplicationSchema = z.object({
  jobId: z.string().min(1, "Job is required"),
  name: z.string().min(2, "Name is required"),
  email: z.string().email("Valid email is required"),
  phone: z.string().optional(),
  resumeUrl: z.string().optional(),
  coverLetter: z.string().optional(),
  screeningResponses: z.record(z.string(), z.string()).optional(),
});

const evaluationScoreValue = z.coerce.number().int().min(1).max(5);

export const evaluationScoresSchema = z
  .record(z.string(), evaluationScoreValue)
  .optional()
  .nullable();

export const jobApplicationStatusSchema = z.object({
  status: z.enum(["new", "reviewing", "interviewed", "rejected", "hired"]),
});

export const jobApplicationUpdateSchema = z.object({
  status: z.enum(["new", "reviewing", "interviewed", "rejected", "hired"]).optional(),
  adminNotes: z.string().max(5000).nullable().optional(),
  note: z.string().trim().min(1).max(2000).optional(),
  evaluationScores: evaluationScoresSchema,
});

export const applicationTrackSchema = z.object({
  trackingCode: z.string().trim().min(1),
  email: z.string().trim().email(),
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
    defaultOnlineBookingAmount: z.preprocess(
      (val) => (val === "" || val == null ? null : Number(val)),
      z.number().positive("Amount must be greater than zero").nullable().optional(),
    ),
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

const showroomDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD date");

export const showroomWalkInSchema = z.object({
  enquiryDate: showroomDateSchema,
  name: z.string().trim().min(2, "Name is required"),
  requiredModel: z.string().trim().min(1, "Required model is required"),
  contactNumber: z.string().trim().optional().or(z.literal("")),
  address: z.string().trim().optional().or(z.literal("")),
  paymentMode: z.enum(SHOWROOM_PAYMENT_MODES).optional().nullable(),
  expectedPurchaseDate: showroomDateSchema.optional().nullable().or(z.literal("")),
});

export const showroomWalkInUpdateSchema = showroomWalkInSchema.partial().extend({
  id: z.string().min(1),
});

const replacementDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD date");

const optionalReplacementDateSchema = z
  .union([replacementDateSchema, z.literal(""), z.null()])
  .optional()
  .transform((value) => (value ? value : undefined));

export const replacementClaimItemSchema = z.object({
  itemType: z.enum(REPLACEMENT_ITEM_TYPES),
  side: z.enum(REPLACEMENT_ITEM_SIDES),
  modelCode: z.string().trim().optional().or(z.literal("")),
  serialNumber: z.string().trim().optional().or(z.literal("")),
  ah: z.coerce.number().positive().optional().nullable(),
  voltage: z.enum(REPLACEMENT_VOLTAGES).optional().nullable(),
  quantity: z.coerce.number().int().min(1).default(1),
  notes: z.string().trim().max(500).optional().or(z.literal("")),
  sortOrder: z.coerce.number().int().min(0).default(0),
});

export const replacementClaimSchema = z.object({
  receivedDate: replacementDateSchema,
  customerName: z.string().trim().min(2, "Customer name is required"),
  customerPhone: z.string().trim().optional().or(z.literal("")),
  billNumber: z.string().trim().optional().or(z.literal("")),
  status: z.enum(REPLACEMENT_STATUSES).default("received_from_customer"),
  sentToCompanyDate: optionalReplacementDateSchema,
  companyReceivedDate: optionalReplacementDateSchema,
  companyInvoiceNumber: z.string().trim().max(100).optional().or(z.literal("")),
  companyDeliveryNote: z.string().trim().max(100).optional().or(z.literal("")),
  returnedToCustomerDate: optionalReplacementDateSchema,
  notes: z.string().trim().max(1000).optional().or(z.literal("")),
  items: z.array(replacementClaimItemSchema).min(1, "At least one item is required"),
});

export const replacementCompanyReceiptSchema = z.object({
  id: z.string().min(1),
  companyReceivedDate: replacementDateSchema,
  companyInvoiceNumber: z.string().trim().max(100).optional().or(z.literal("")),
  companyDeliveryNote: z.string().trim().max(100).optional().or(z.literal("")),
  returnToCustomerNow: z.boolean().optional(),
  returnedToCustomerDate: replacementDateSchema.optional(),
  items: z.array(replacementClaimItemSchema).min(1, "Add at least one replacement item"),
});

export const replacementSendToCompanySchema = z.object({
  ids: z.array(z.string().min(1)).min(1, "Select at least one claim"),
  sentToCompanyDate: replacementDateSchema,
  courierNote: z.string().trim().max(200).optional().or(z.literal("")),
});

export const replacementReturnToCustomerSchema = z.object({
  ids: z.array(z.string().min(1)).min(1, "Select at least one claim"),
  returnedToCustomerDate: replacementDateSchema,
  handoverNote: z.string().trim().max(200).optional().or(z.literal("")),
});

export const replacementClaimUpdateSchema = replacementClaimSchema.partial().extend({
  id: z.string().min(1),
});

export const replacementStatusUpdateSchema = z.object({
  id: z.string().min(1),
  status: z.enum(REPLACEMENT_STATUSES),
});

export type VehicleInput = z.infer<typeof vehicleSchema>;
export type ServiceInput = z.infer<typeof serviceSchema>;
export type BookingInput = z.infer<typeof bookingSchema>;
export type InquiryInput = z.infer<typeof inquirySchema>;
