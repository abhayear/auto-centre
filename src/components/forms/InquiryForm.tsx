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
}

export function InquiryForm({
  type,
  vehicleId,
  vehicleLabel,
  onlineBookingRefund,
}: InquiryFormProps) {
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setErrors({});

    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());

    try {
      const res = await fetch("/api/inquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, type, vehicleId }),
      });

      const result = await res.json();

      if (!res.ok) {
        toast.error(result.error ?? "Failed to submit booking");
        return;
      }

      const messages = {
        test_drive:
          onlineBookingRefund != null && onlineBookingRefund > 0
            ? `Online booking submitted! You are eligible for a ${formatPrice(onlineBookingRefund)} cash refund from Auto Galaxy. We will contact you shortly.`
            : "Online booking submitted! We will contact you shortly.",
        contact: "Message sent! We'll respond within 24 hours.",
        general: "Inquiry submitted successfully!",
      };
      toast.success(messages[type]);
      (e.target as HTMLFormElement).reset();
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
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
        <Input
          id="name"
          name="name"
          label="Full Name"
          required
          error={errors.name}
        />
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
        {type === "test_drive" ? "Book Online" : "Send Message"}
      </Button>
    </form>
  );
}
