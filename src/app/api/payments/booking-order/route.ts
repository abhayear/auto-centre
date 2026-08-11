import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";
import {
  amountToPaise,
  getEffectiveOnlineBookingAmount,
  getRazorpayKeyId,
  isRazorpayConfigured,
  requiresOnlineBookingPayment,
} from "@/lib/booking-payment";
import { prisma } from "@/lib/prisma";
import {
  getRazorpayMerchantName,
  isRazorpayTestKey,
  normalizeIndianPhone,
  resolveRazorpayMerchantImage,
} from "@/lib/razorpay-checkout";
import { getRazorpayClient } from "@/lib/razorpay-client";
import { bookingOrderSchema, formatZodErrors } from "@/lib/validators";

const bookingOrderByInquirySchema = z.object({
  inquiryId: z.string().trim().min(1),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if ("inquiryId" in body && body.inquiryId) {
      const { inquiryId } = bookingOrderByInquirySchema.parse(body);

      const inquiry = await prisma.inquiry.findUnique({
        where: { id: inquiryId },
        include: {
          vehicle: {
            select: {
              id: true,
              year: true,
              make: true,
              model: true,
              onlineBookingAmount: true,
              status: true,
            },
          },
        },
      });

      if (!inquiry || inquiry.type !== "test_drive" || inquiry.paymentStatus !== "pending") {
        return NextResponse.json({ error: "Booking not found or payment not pending" }, { status: 404 });
      }

      if (!inquiry.vehicle || inquiry.vehicle.status !== "available") {
        return NextResponse.json({ error: "Vehicle not available for booking" }, { status: 404 });
      }

      const bookingAmount = inquiry.bookingAmountAtBooking;

      if (!requiresOnlineBookingPayment(bookingAmount)) {
        return NextResponse.json({ paymentRequired: false, bookingAmount: null });
      }

      if (!isRazorpayConfigured()) {
        return NextResponse.json(
          { error: "Online payment is not configured yet. Please contact Auto Galaxy." },
          { status: 503 },
        );
      }

      const razorpay = getRazorpayClient();
      if (!razorpay) {
        return NextResponse.json({ error: "Payment service unavailable" }, { status: 503 });
      }

      const order = await razorpay.orders.create({
        amount: amountToPaise(bookingAmount!),
        currency: "INR",
        receipt: `booking-${inquiry.id.slice(-8)}-${Date.now()}`,
        payment_capture: true,
        notes: {
          inquiryId: inquiry.id,
          vehicleId: inquiry.vehicle.id,
          customerName: inquiry.name,
          customerEmail: inquiry.email,
        },
      });

      const keyId = getRazorpayKeyId();
      const siteSettings = await prisma.siteSettings.findUnique({
        where: { id: "default" },
        select: { logoUrl: true },
      });

      return NextResponse.json({
        paymentRequired: true,
        bookingAmount,
        amountPaise: Number(order.amount),
        orderId: order.id,
        keyId,
        isTestMode: isRazorpayTestKey(keyId),
        merchantName: getRazorpayMerchantName(),
        merchantImage: resolveRazorpayMerchantImage(siteSettings?.logoUrl),
        inquiryId: inquiry.id,
        vehicleLabel: `${inquiry.vehicle.year} ${inquiry.vehicle.make} ${inquiry.vehicle.model}`,
        customerName: inquiry.name,
        customerEmail: inquiry.email,
        customerPhone: normalizeIndianPhone(inquiry.phone),
      });
    }

    const data = bookingOrderSchema.parse(body);

    const [vehicle, siteSettings] = await Promise.all([
      prisma.vehicle.findUnique({
        where: { id: data.vehicleId },
        select: {
          id: true,
          make: true,
          model: true,
          year: true,
          onlineBookingAmount: true,
          status: true,
        },
      }),
      prisma.siteSettings.findUnique({
        where: { id: "default" },
        select: { defaultOnlineBookingAmount: true },
      }),
    ]);

    if (!vehicle || vehicle.status !== "available") {
      return NextResponse.json({ error: "Vehicle not available for booking" }, { status: 404 });
    }

    const bookingAmount = getEffectiveOnlineBookingAmount(
      vehicle.onlineBookingAmount,
      siteSettings?.defaultOnlineBookingAmount,
    );

    if (!requiresOnlineBookingPayment(bookingAmount)) {
      return NextResponse.json({
        paymentRequired: false,
        bookingAmount: null,
      });
    }

    if (!isRazorpayConfigured()) {
      return NextResponse.json(
        { error: "Online payment is not configured yet. Please contact Auto Galaxy." },
        { status: 503 },
      );
    }

    const razorpay = getRazorpayClient();
    if (!razorpay) {
      return NextResponse.json({ error: "Payment service unavailable" }, { status: 503 });
    }

    const order = await razorpay.orders.create({
      amount: amountToPaise(bookingAmount!),
      currency: "INR",
      receipt: `booking-${vehicle.id.slice(-8)}-${Date.now()}`,
      payment_capture: true,
      notes: {
        vehicleId: vehicle.id,
        customerName: data.name,
        customerEmail: data.email,
        customerPhone: data.phone,
      },
    });

    const keyId = getRazorpayKeyId();

    return NextResponse.json({
      paymentRequired: true,
      bookingAmount,
      amountPaise: Number(order.amount),
      orderId: order.id,
      keyId,
      isTestMode: isRazorpayTestKey(keyId),
      merchantName: getRazorpayMerchantName(),
      merchantImage: resolveRazorpayMerchantImage(siteSettings?.logoUrl),
      vehicleLabel: `${vehicle.year} ${vehicle.make} ${vehicle.model}`,
      customerName: data.name,
      customerEmail: data.email,
      customerPhone: normalizeIndianPhone(data.phone),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: formatZodErrors(error) },
        { status: 400 },
      );
    }
    return NextResponse.json({ error: "Failed to create payment order" }, { status: 500 });
  }
}
