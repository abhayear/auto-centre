import { observeRoute } from "@/lib/health/observe-route";
import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import {
  getEffectiveOnlineBookingAmount,
  requiresOnlineBookingPayment,
  verifyRazorpayPaymentSignature,
} from "@/lib/booking-payment";
import { prisma } from "@/lib/prisma";
import { parseShowroomDateInput } from "@/lib/showroom-walk-ins";
import { getRazorpayClient } from "@/lib/razorpay-client";
import {
  formatZodErrors,
  inquirySchema,
  inquiryStatusSchema,
  resolveOnlineBookingRefund,
} from "@/lib/validators";

async function resolveVehicleBookingFields(vehicleId: string | undefined, type: string) {
  if (!vehicleId || type !== "test_drive") {
    return {
      refundAmountAtBooking: null,
      bookingAmountAtBooking: null,
      paymentRequired: false,
    };
  }

  const [vehicle, siteSettings] = await Promise.all([
    prisma.vehicle.findUnique({
      where: { id: vehicleId },
      select: { onlineBookingRefund: true, onlineBookingAmount: true },
    }),
    prisma.siteSettings.findUnique({
      where: { id: "default" },
      select: { defaultOnlineBookingAmount: true },
    }),
  ]);

  const effectiveBookingAmount = getEffectiveOnlineBookingAmount(
    vehicle?.onlineBookingAmount,
    siteSettings?.defaultOnlineBookingAmount,
  );

  return {
    refundAmountAtBooking: resolveOnlineBookingRefund(
      type,
      vehicleId,
      vehicle?.onlineBookingRefund,
    ),
    bookingAmountAtBooking: effectiveBookingAmount,
    paymentRequired: requiresOnlineBookingPayment(effectiveBookingAmount),
  };
}

function buildInquiryDateFilter(from?: string | null, to?: string | null) {
  if (!from && !to) return undefined;

  const createdAt: { gte?: Date; lte?: Date } = {};
  if (from) createdAt.gte = parseShowroomDateInput(from);
  if (to) {
    const end = parseShowroomDateInput(to);
    end.setUTCHours(23, 59, 59, 999);
    createdAt.lte = end;
  }

  return { createdAt };
}

 async function getHandler(request: NextRequest) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const status = searchParams.get("status");
  const type = searchParams.get("type");
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const inquiries = await prisma.inquiry.findMany({
    where: {
      ...(status ? { status } : {}),
      ...(type ? { type } : {}),
      ...buildInquiryDateFilter(from, to),
    },
    include: { vehicle: true },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(inquiries);
}

 async function postHandler(request: NextRequest) {
  try {
    const body = await request.json();
    const data = inquirySchema.parse(body);

    const { refundAmountAtBooking, bookingAmountAtBooking, paymentRequired } =
      await resolveVehicleBookingFields(data.vehicleId, data.type);

    let paymentStatus: "not_required" | "paid" = "not_required";
    let paymentOrderId: string | null = null;
    let paymentId: string | null = null;

    if (paymentRequired) {
      const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = data;

      if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
        const inquiry = await prisma.inquiry.create({
          data: {
            type: data.type,
            name: data.name,
            email: data.email,
            phone: data.phone ?? null,
            message: data.message,
            vehicleId: data.vehicleId ?? null,
            refundAmountAtBooking,
            bookingAmountAtBooking,
            paymentStatus: "pending",
          },
          include: { vehicle: true },
        });

        return NextResponse.json(inquiry, { status: 201 });
      }

      const secret = process.env.RAZORPAY_KEY_SECRET;
      if (!secret) {
        return NextResponse.json({ error: "Payment verification unavailable" }, { status: 503 });
      }

      const signatureValid = verifyRazorpayPaymentSignature(
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature,
        secret,
      );

      if (!signatureValid) {
        return NextResponse.json({ error: "Payment verification failed" }, { status: 400 });
      }

      const existing = await prisma.inquiry.findUnique({
        where: { paymentOrderId: razorpay_order_id },
      });
      if (existing) {
        return NextResponse.json({ error: "This payment was already used for a booking" }, { status: 409 });
      }

      const razorpay = getRazorpayClient();
      if (razorpay) {
        const order = await razorpay.orders.fetch(razorpay_order_id);
        const expectedPaise = Math.round((bookingAmountAtBooking ?? 0) * 100);
        if (Number(order.amount) !== expectedPaise || order.status !== "paid") {
          return NextResponse.json({ error: "Payment amount mismatch" }, { status: 400 });
        }
      }

      paymentStatus = "paid";
      paymentOrderId = razorpay_order_id;
      paymentId = razorpay_payment_id;
    }

    const inquiry = await prisma.inquiry.create({
      data: {
        type: data.type,
        name: data.name,
        email: data.email,
        phone: data.phone ?? null,
        message: data.message,
        vehicleId: data.vehicleId ?? null,
        refundAmountAtBooking,
        bookingAmountAtBooking,
        paymentStatus,
        paymentOrderId,
        paymentId,
      },
      include: { vehicle: true },
    });

    return NextResponse.json(inquiry, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: formatZodErrors(error) },
        { status: 400 },
      );
    }
    return NextResponse.json({ error: "Failed to create inquiry" }, { status: 500 });
  }
}

 async function patchHandler(request: NextRequest) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { id, ...rest } = body;

    if (!id) {
      return NextResponse.json({ error: "Inquiry ID required" }, { status: 400 });
    }

    const { status } = inquiryStatusSchema.parse(rest);

    const inquiry = await prisma.inquiry.update({
      where: { id },
      data: { status },
      include: { vehicle: true },
    });

    return NextResponse.json(inquiry);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: formatZodErrors(error) },
        { status: 400 },
      );
    }
    return NextResponse.json({ error: "Failed to update inquiry" }, { status: 500 });
  }
}

 async function deleteHandler(request: NextRequest) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const idsParam = request.nextUrl.searchParams.get("ids");
  if (!idsParam) {
    return NextResponse.json({ error: "Inquiry IDs required" }, { status: 400 });
  }

  const ids = idsParam.split(",").map((id) => id.trim()).filter(Boolean);
  if (ids.length === 0) {
    return NextResponse.json({ error: "No inquiry IDs provided" }, { status: 400 });
  }

  try {
    const result = await prisma.inquiry.deleteMany({
      where: { id: { in: ids } },
    });
    return NextResponse.json({ success: true, deleted: result.count });
  } catch {
    return NextResponse.json({ error: "Failed to delete inquiries" }, { status: 500 });
  }
}

export const GET = observeRoute(getHandler);
export const POST = observeRoute(postHandler);
export const PATCH = observeRoute(patchHandler);
export const DELETE = observeRoute(deleteHandler);
