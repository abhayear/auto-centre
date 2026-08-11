"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2, Loader2 } from "lucide-react";
import { BookingStepNav, BookingSteps } from "@/components/booking/BookingSteps";
import { Button } from "@/components/ui/Button";
import { formatPrice } from "@/lib/utils";

type BookingSummary = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  paymentStatus: string;
  bookingAmountAtBooking: number | null;
  refundAmountAtBooking: number | null;
  vehicleLabel: string | null;
};

export function BookingConfirmationClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const bookingId = searchParams.get("id");

  const [booking, setBooking] = useState<BookingSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!bookingId) {
      setLoading(false);
      return;
    }

    async function load() {
      try {
        const res = await fetch(`/api/inquiries/${bookingId}`);
        const data = await res.json();
        if (res.ok) setBooking(data);
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, [bookingId]);

  useEffect(() => {
    if (booking?.paymentStatus === "pending" && bookingId) {
      router.replace(`/test-drive/payment?id=${bookingId}`);
    }
  }, [booking, bookingId, router]);

  if (loading || booking?.paymentStatus === "pending") {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-red-500" />
      </div>
    );
  }

  const paid = booking?.paymentStatus === "paid";

  return (
    <>
      <BookingSteps current={3} />

      <div className="rounded-xl border border-slate-700/50 bg-slate-800/30 p-8 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-900/40">
          <CheckCircle2 className="h-8 w-8 text-green-400" />
        </div>

        <h1 className="text-2xl font-bold text-white">Booking Confirmed!</h1>

        <p className="mx-auto mt-3 max-w-lg text-slate-300">
          {paid
            ? "Thank you! Your payment was received and your online e-scooter booking is confirmed. Our team will contact you shortly."
            : "Thank you! Your online e-scooter booking has been submitted. Our team will contact you shortly."}
        </p>

        {booking && (
          <div className="mx-auto mt-6 max-w-md rounded-lg border border-slate-700 bg-slate-900/50 p-4 text-left text-sm">
            {booking.vehicleLabel && (
              <p className="mb-2 text-white">
                <span className="text-slate-500">Model: </span>
                {booking.vehicleLabel}
              </p>
            )}
            <p className="text-slate-300">
              <span className="text-slate-500">Name: </span>
              {booking.name}
            </p>
            {booking.bookingAmountAtBooking != null && booking.bookingAmountAtBooking > 0 && (
              <p className="mt-2 text-slate-300">
                <span className="text-slate-500">Payment: </span>
                {paid ? "Paid " : "Due "}
                {formatPrice(booking.bookingAmountAtBooking)}
              </p>
            )}
            {booking.refundAmountAtBooking != null && booking.refundAmountAtBooking > 0 && (
              <p className="mt-2 text-green-400">
                Cash refund eligible: {formatPrice(booking.refundAmountAtBooking)}
              </p>
            )}
            {bookingId && (
              <p className="mt-3 text-xs text-slate-500">Reference: {bookingId.slice(-8).toUpperCase()}</p>
            )}
          </div>
        )}

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/vehicles">
            <Button>Browse E-Scooters</Button>
          </Link>
          <Link href="/">
            <Button variant="outline">Back to Home</Button>
          </Link>
        </div>
      </div>

      <BookingStepNav backHref="/test-drive" backLabel="Book another e-scooter" />
    </>
  );
}
