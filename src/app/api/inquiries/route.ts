import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import {
  resolveOnlineBookingAmount,
  requiresOnlineBookingPayment,
  verifyRazorpayPaymentSignature,
} from "@/lib/booking-payment";
import { prisma } from "@/lib/prisma";
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

  const vehicle = await prisma.vehicle.findUnique({
    where: { id: vehicleId },
    select: { onlineBookingRefund: true, onlineBookingAmount: true },
  });

  return {
    refundAmountAtBooking: resolveOnlineBookingRefund(
      type,
      vehicleId,
      vehicle?.onlineBookingRefund,
    ),
    bookingAmountAtBooking: resolveOnlineBookingAmount(
      type,
      vehicleId,
      vehicle?.onlineBookingAmount,
    ),
    paymentRequired: requiresOnlineBookingPayment(
      resolveOnlineBookingAmount(type, vehicleId, vehicle?.onlineBookingAmount),
    ),
  };
}

export async function GET(request: NextRequest) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const status = searchParams.get("status");
  const type = searchParams.get("type");

  const inquiries = await prisma.inquiry.findMany({
    where: {
      ...(status ? { status } : {}),
      ...(type ? { type } : {}),
    },
    include: { vehicle: true },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(inquiries);
}

export async function POST(request: NextRequest) {
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
        return NextResponse.json(
          { error: "Payment is required to complete this booking" },
          { status: 400 },
        );
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

export async function PATCH(request: NextRequest) {
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
