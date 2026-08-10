"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import toast from "react-hot-toast";
import { CreditCard, Loader2 } from "lucide-react";
import { BookingStepNav, BookingSteps } from "@/components/booking/BookingSteps";
import { Button } from "@/components/ui/Button";
import { formatPrice } from "@/lib/utils";

type BookingSummary = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  message: string;
  paymentStatus: string;
  bookingAmountAtBooking: number | null;
  refundAmountAtBooking: number | null;
  vehicleLabel: string | null;
};

function loadRazorpayScript(): Promise<void> {
  if (window.Razorpay) return Promise.resolve();

  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load payment gateway"));
    document.body.appendChild(script);
  });
}

export function BookingPaymentClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const bookingId = searchParams.get("id");

  const [booking, setBooking] = useState<BookingSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    if (!bookingId) {
      setLoading(false);
      return;
    }

    async function load() {
      try {
        const res = await fetch(`/api/inquiries/${bookingId}`);
        const data = await res.json();

        if (!res.ok) {
          toast.error(data.error ?? "Booking not found");
          setBooking(null);
          return;
        }

        if (data.paymentStatus === "paid") {
          router.replace(`/test-drive/confirmation?id=${bookingId}`);
          return;
        }

        if (data.paymentStatus !== "pending") {
          router.replace(`/test-drive/confirmation?id=${bookingId}`);
          return;
        }

        setBooking(data);
      } catch {
        toast.error("Could not load booking details");
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, [bookingId, router]);

  async function handlePay() {
    if (!booking || !bookingId) return;

    setPaying(true);

    try {
      const orderRes = await fetch("/api/payments/booking-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inquiryId: bookingId }),
      });

      const orderData = await orderRes.json();

      if (!orderRes.ok) {
        toast.error(orderData.error ?? "Could not start payment");
        return;
      }

      await loadRazorpayScript();

      if (!window.Razorpay) {
        toast.error("Payment gateway failed to load");
        return;
      }

      await new Promise<void>((resolve) => {
        const checkout = new window.Razorpay!({
          key: orderData.keyId,
          amount: Math.round(orderData.bookingAmount * 100),
          currency: "INR",
          name: "Auto Galaxy",
          description: `Online booking — ${orderData.vehicleLabel ?? "E-scooter"}`,
          order_id: orderData.orderId,
          prefill: {
            name: orderData.customerName,
            email: orderData.customerEmail,
            contact: orderData.customerPhone ?? undefined,
          },
          theme: { color: "#dc2626" },
          handler: async (response) => {
            const payRes = await fetch(`/api/inquiries/${bookingId}/pay`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              }),
            });

            const payData = await payRes.json();

            if (!payRes.ok) {
              toast.error(payData.error ?? "Payment confirmation failed");
              resolve();
              return;
            }

            router.push(`/test-drive/confirmation?id=${bookingId}`);
            resolve();
          },
          modal: {
            ondismiss: () => {
              toast.error("Payment cancelled");
              resolve();
            },
          },
        });

        checkout.open();
      });
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setPaying(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-red-500" />
      </div>
    );
  }

  if (!bookingId || !booking) {
    return (
      <div className="rounded-xl border border-slate-700/50 bg-slate-800/30 p-8 text-center">
        <p className="text-slate-300">Booking not found or payment is not required.</p>
        <BookingStepNav backHref="/test-drive" backLabel="Start a new booking" />
      </div>
    );
  }

  return (
    <>
      <BookingSteps current={2} />

      <div className="rounded-xl border border-slate-700/50 bg-slate-800/30 p-6">
        <div className="mb-6 flex items-center gap-3">
          <div className="rounded-full bg-amber-900/40 p-3">
            <CreditCard className="h-6 w-6 text-amber-300" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Complete Your Payment</h1>
            <p className="text-sm text-slate-400">
              Step 2 of 3 — pay the booking amount to confirm your e-scooter booking
            </p>
          </div>
        </div>

        <div className="space-y-4 rounded-lg border border-slate-700 bg-slate-900/50 p-4">
          <div>
            <p className="text-xs text-slate-500">Selected model</p>
            <p className="font-medium text-white">{booking.vehicleLabel ?? "E-scooter"}</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-xs text-slate-500">Name</p>
              <p className="text-slate-200">{booking.name}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Phone</p>
              <p className="text-slate-200">{booking.phone ?? "—"}</p>
            </div>
          </div>
          <div>
            <p className="text-xs text-slate-500">Notes</p>
            <p className="text-slate-300">{booking.message}</p>
          </div>
          <div className="border-t border-slate-700 pt-4">
            <p className="text-sm text-slate-400">Booking payment due</p>
            <p className="text-3xl font-bold text-amber-300">
              {formatPrice(booking.bookingAmountAtBooking ?? 0)}
            </p>
          </div>
          {booking.refundAmountAtBooking != null && booking.refundAmountAtBooking > 0 && (
            <div className="rounded-lg border border-green-700/50 bg-green-900/20 px-4 py-3">
              <p className="text-sm text-green-300">
                After confirmation you are eligible for a{" "}
                {formatPrice(booking.refundAmountAtBooking)} cash refund from Auto Galaxy.
              </p>
            </div>
          )}
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <Button onClick={handlePay} loading={paying} className="min-w-[200px]">
            Pay {formatPrice(booking.bookingAmountAtBooking ?? 0)} Now
          </Button>
        </div>

        <p className="mt-4 text-xs text-slate-500">
          Secure payment via Razorpay — UPI, cards, and net banking accepted.
        </p>
      </div>

      <BookingStepNav backHref="/test-drive" backLabel="Back to booking form" />
    </>
  );
}
