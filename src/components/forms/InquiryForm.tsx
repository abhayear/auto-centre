"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { BookingSteps } from "@/components/booking/BookingSteps";
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
  showBookingSteps?: boolean;
}

export function InquiryForm({
  type,
  vehicleId,
  vehicleLabel,
  onlineBookingRefund,
  onlineBookingAmount,
  showBookingSteps = false,
}: InquiryFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const paymentRequired =
    type === "test_drive" &&
    onlineBookingAmount != null &&
    onlineBookingAmount > 0;

  function validateClientForm(data: Record<string, string>): Record<string, string> {
    const nextErrors: Record<string, string> = {};
    if (data.name.trim().length < 2) nextErrors.name = "Name is required";
    if (!data.email.trim().includes("@")) nextErrors.email = "Valid email is required";
    if (type === "test_drive" && data.phone.trim().length < 7) {
      nextErrors.phone = "Phone number must be at least 7 digits";
    }
    if (data.message.trim().length < 10) {
      nextErrors.message = "Please enter at least 10 characters (date, time, or questions)";
    }
    return nextErrors;
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setErrors({});

    const form = e.currentTarget;
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries()) as Record<string, string>;
    const trimmed = {
      name: data.name?.trim() ?? "",
      email: data.email?.trim() ?? "",
      phone: data.phone?.trim() ?? "",
      message: data.message?.trim() ?? "",
      vehicleId: data.vehicleId?.trim() ?? vehicleId,
    };

    const clientErrors = validateClientForm(trimmed);
    if (Object.keys(clientErrors).length > 0) {
      setErrors(clientErrors);
      toast.error(Object.values(clientErrors).join(" "));
      setLoading(false);
      return;
    }

    const payload = {
      ...trimmed,
      type,
      vehicleId: trimmed.vehicleId || vehicleId,
    };

    try {
      const res = await fetch("/api/inquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await res.json();

      if (!res.ok) {
        if (Array.isArray(result.details)) {
          const fieldErrors: Record<string, string> = {};
          for (const detail of result.details as { field: string; message: string }[]) {
            fieldErrors[detail.field] = detail.message;
          }
          setErrors(fieldErrors);
          toast.error(
            (result.details as { message: string }[]).map((d) => d.message).join(" "),
          );
        } else {
          toast.error(result.error ?? "Failed to submit booking");
        }
        return;
      }

      if (type === "test_drive" && result.id) {
        if (result.paymentStatus === "pending") {
          router.push(`/test-drive/payment?id=${result.id}`);
          return;
        }
        router.push(`/test-drive/confirmation?id=${result.id}`);
        return;
      }

      toast.success("Message sent! We'll respond within 24 hours.");
      form.reset();
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {showBookingSteps && type === "test_drive" && <BookingSteps current={1} />}

      <form onSubmit={handleSubmit} className="space-y-4">
        {type === "test_drive" && paymentRequired && (
          <div className="rounded-lg border border-amber-700/50 bg-amber-900/20 px-4 py-3">
            <p className="font-medium text-amber-200">
              Booking payment: {formatPrice(onlineBookingAmount!)}
            </p>
            <p className="mt-1 text-xs text-amber-300/80">
              You will pay on the next page after submitting your booking details.
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
        {type === "test_drive" && !errors.message && (
          <p className="text-xs text-slate-500">
            Minimum 10 characters — include preferred date/time.
          </p>
        )}
        <Button type="submit" loading={loading} className="w-full sm:w-auto">
          {type === "test_drive"
            ? paymentRequired
              ? "Continue to Payment"
              : "Book Online"
            : "Send Message"}
        </Button>
      </form>
    </>
  );
}
