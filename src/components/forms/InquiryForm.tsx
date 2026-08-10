"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { formatPrice } from "@/lib/utils";

interface InquiryFormProps {
  type: "test_drive" | "contact" | "general";
  vehicleId?: string;
  vehicleLabel?: string;
  onlineBookingRefund?: number | null;
  onlineBookingAmount?: number | null;
}

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

export function InquiryForm({
  type,
  vehicleId,
  vehicleLabel,
  onlineBookingRefund,
  onlineBookingAmount,
}: InquiryFormProps) {
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const paymentRequired =
    type === "test_drive" &&
    onlineBookingAmount != null &&
    onlineBookingAmount > 0;

  async function submitInquiry(
    payload: Record<string, unknown>,
    successMessage: string,
    form?: HTMLFormElement,
  ) {
    const res = await fetch("/api/inquiries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const result = await res.json();

    if (!res.ok) {
      toast.error(result.error ?? "Failed to submit booking");
      return false;
    }

    toast.success(successMessage);
    form?.reset();
    return true;
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setErrors({});

    const form = e.currentTarget;
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries()) as Record<string, string>;

    const basePayload = {
      ...data,
      type,
      vehicleId,
    };

    const successMessage =
      onlineBookingRefund != null && onlineBookingRefund > 0
        ? `Booking confirmed! Payment received. You are eligible for a ${formatPrice(onlineBookingRefund)} cash refund from Auto Galaxy.`
        : paymentRequired
          ? "Booking confirmed! Payment received. We will contact you shortly."
          : "Online booking submitted! We will contact you shortly.";

    try {
      if (type === "test_drive" && vehicleId && paymentRequired) {
        const orderRes = await fetch("/api/payments/booking-order", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            vehicleId,
            name: data.name,
            email: data.email,
            phone: data.phone,
            message: data.message,
          }),
        });

        const orderData = await orderRes.json();

        if (!orderRes.ok) {
          toast.error(orderData.error ?? "Could not start payment");
          return;
        }

        if (!orderData.paymentRequired) {
          await submitInquiry(basePayload, successMessage, form);
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
            description: `Online booking — ${orderData.vehicleLabel ?? vehicleLabel ?? "E-scooter"}`,
            order_id: orderData.orderId,
            prefill: {
              name: data.name,
              email: data.email,
              contact: data.phone,
            },
            theme: { color: "#dc2626" },
            handler: async (response) => {
              await submitInquiry(
                {
                  ...basePayload,
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature,
                },
                successMessage,
                form,
              );
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
        return;
      }

      await submitInquiry(
        basePayload,
        type === "test_drive" ? successMessage : "Message sent! We'll respond within 24 hours.",
        form,
      );
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {type === "test_drive" && paymentRequired && (
        <div className="rounded-lg border border-amber-700/50 bg-amber-900/20 px-4 py-3">
          <p className="font-medium text-amber-200">
            Booking payment: {formatPrice(onlineBookingAmount!)}
          </p>
          <p className="mt-1 text-xs text-amber-300/80">
            Pay online to confirm your e-scooter booking. Amount is set by Auto Galaxy for this
            model.
          </p>
        </div>
      )}
      {type === "test_drive" &&
        onlineBookingRefund != null &&
        onlineBookingRefund > 0 &&
        vehicleLabel && (
          <div className="rounded-lg border border-green-700/50 bg-green-900/20 px-4 py-3">
            <p className="font-medium text-green-300">
              Get {formatPrice(onlineBookingRefund)} cash refund when you book this e-scooter
              online
            </p>
            <p className="mt-1 text-xs text-green-400/80">
              Refund amount set by Auto Galaxy — paid after booking confirmation
            </p>
          </div>
        )}
      {vehicleLabel && (
        <div className="rounded-lg border border-slate-700 bg-slate-800/50 px-4 py-3">
          <p className="text-sm text-slate-400">Selected model</p>
          <p className="font-medium text-white">{vehicleLabel}</p>
          <input type="hidden" name="vehicleId" value={vehicleId} />
        </div>
      )}
      {!vehicleLabel && vehicleId ? (
        <input type="hidden" name="vehicleId" value={vehicleId} />
      ) : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <Input id="name" name="name" label="Full Name" required error={errors.name} />
        <Input
          id="email"
          name="email"
          type="email"
          label="Email"
          required
          error={errors.email}
        />
      </div>
      <Input
        id="phone"
        name="phone"
        type="tel"
        label="Phone"
        required={type === "test_drive"}
        error={errors.phone}
      />
      <Textarea
        id="message"
        name="message"
        label={type === "test_drive" ? "Preferred Date & Notes" : "Message"}
        rows={4}
        required
        placeholder={
          type === "test_drive"
            ? "Preferred date/time, delivery or pickup preference, questions..."
            : "How can we help you?"
        }
        error={errors.message}
      />
      <Button type="submit" loading={loading} className="w-full sm:w-auto">
        {type === "test_drive"
          ? paymentRequired
            ? `Pay ${formatPrice(onlineBookingAmount!)} & Book`
            : "Book Online"
          : "Send Message"}
      </Button>
    </form>
  );
}
