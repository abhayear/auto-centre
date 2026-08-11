import { Suspense } from "react";
import type { Metadata } from "next";
import { BookingPaymentClient } from "@/components/booking/BookingPaymentClient";
import { getRazorpayKeyId } from "@/lib/booking-payment";
import { isRazorpayTestKey } from "@/lib/razorpay-checkout";

export const metadata: Metadata = {
  title: "Payment — Book Online",
  description: "Complete your e-scooter online booking payment at Auto Galaxy.",
};

export default function BookingPaymentPage() {
  const isTestMode = isRazorpayTestKey(getRazorpayKeyId());

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6 lg:px-8">
      <Suspense
        fallback={
          <div className="flex justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-red-500 border-t-transparent" />
          </div>
        }
      >
        <BookingPaymentClient initialTestMode={isTestMode} />
      </Suspense>
    </div>
  );
}
