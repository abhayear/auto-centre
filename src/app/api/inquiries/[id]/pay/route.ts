import { observeRoute } from "@/lib/health/observe-route";
import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";
import { verifyRazorpayPaymentSignature } from "@/lib/booking-payment";
import { prisma } from "@/lib/prisma";
import { getRazorpayClient } from "@/lib/razorpay-client";
import { formatZodErrors } from "@/lib/validators";

type Params = { params: Promise<{ id: string }> };

const payInquirySchema = z.object({
  razorpay_order_id: z.string().trim().min(1),
  razorpay_payment_id: z.string().trim().min(1),
  razorpay_signature: z.string().trim().min(1),
});

 async function postHandler(request: NextRequest, { params }: Params) {
  const { id } = await params;

  try {
    const body = await request.json();
    const payment = payInquirySchema.parse(body);

    const inquiry = await prisma.inquiry.findUnique({
      where: { id },
      include: { vehicle: true },
    });

    if (!inquiry || inquiry.type !== "test_drive") {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    if (inquiry.paymentStatus === "paid") {
      return NextResponse.json({ error: "This booking is already paid" }, { status: 409 });
    }

    if (inquiry.paymentStatus !== "pending") {
      return NextResponse.json({ error: "Payment is not required for this booking" }, { status: 400 });
    }

    const secret = process.env.RAZORPAY_KEY_SECRET;
    if (!secret) {
      return NextResponse.json({ error: "Payment verification unavailable" }, { status: 503 });
    }

    const signatureValid = verifyRazorpayPaymentSignature(
      payment.razorpay_order_id,
      payment.razorpay_payment_id,
      payment.razorpay_signature,
      secret,
    );

    if (!signatureValid) {
      return NextResponse.json({ error: "Payment verification failed" }, { status: 400 });
    }

    const existing = await prisma.inquiry.findUnique({
      where: { paymentOrderId: payment.razorpay_order_id },
    });
    if (existing && existing.id !== id) {
      return NextResponse.json({ error: "This payment was already used" }, { status: 409 });
    }

    const razorpay = getRazorpayClient();
    if (razorpay) {
      const order = await razorpay.orders.fetch(payment.razorpay_order_id);
      const expectedPaise = Math.round((inquiry.bookingAmountAtBooking ?? 0) * 100);
      if (Number(order.amount) !== expectedPaise || order.status !== "paid") {
        return NextResponse.json({ error: "Payment amount mismatch" }, { status: 400 });
      }
    }

    const updated = await prisma.inquiry.update({
      where: { id },
      data: {
        paymentStatus: "paid",
        paymentOrderId: payment.razorpay_order_id,
        paymentId: payment.razorpay_payment_id,
      },
      include: { vehicle: true },
    });

    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: formatZodErrors(error) },
        { status: 400 },
      );
    }
    return NextResponse.json({ error: "Failed to confirm payment" }, { status: 500 });
  }
}

export const POST = observeRoute(postHandler);
