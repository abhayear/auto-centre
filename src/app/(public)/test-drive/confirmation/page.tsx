import { Suspense } from "react";
import type { Metadata } from "next";
import { BookingConfirmationClient } from "@/components/booking/BookingConfirmationClient";

export const metadata: Metadata = {
  title: "Booking Confirmed",
  description: "Your e-scooter online booking confirmation from Auto Galaxy.",
};

export default function BookingConfirmationPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6 lg:px-8">
      <Suspense
        fallback={
          <div className="flex justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-red-500 border-t-transparent" />
          </div>
        }
      >
        <BookingConfirmationClient />
      </Suspense>
    </div>
  );
}
