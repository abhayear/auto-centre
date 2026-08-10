import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";
import {
  amountToPaise,
  getRazorpayKeyId,
  isRazorpayConfigured,
  requiresOnlineBookingPayment,
  resolveOnlineBookingAmount,
} from "@/lib/booking-payment";
import { prisma } from "@/lib/prisma";
import { getRazorpayClient } from "@/lib/razorpay-client";
import { bookingOrderSchema, formatZodErrors } from "@/lib/validators";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const data = bookingOrderSchema.parse(body);

    const vehicle = await prisma.vehicle.findUnique({
      where: { id: data.vehicleId },
      select: {
        id: true,
        make: true,
        model: true,
        year: true,
        onlineBookingAmount: true,
        status: true,
      },
    });

    if (!vehicle || vehicle.status !== "available") {
      return NextResponse.json({ error: "Vehicle not available for booking" }, { status: 404 });
    }

    const bookingAmount = resolveOnlineBookingAmount(
      "test_drive",
      vehicle.id,
      vehicle.onlineBookingAmount,
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
      notes: {
        vehicleId: vehicle.id,
        customerName: data.name,
        customerEmail: data.email,
        customerPhone: data.phone,
      },
    });

    return NextResponse.json({
      paymentRequired: true,
      bookingAmount,
      orderId: order.id,
      keyId: getRazorpayKeyId(),
      vehicleLabel: `${vehicle.year} ${vehicle.make} ${vehicle.model}`,
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
