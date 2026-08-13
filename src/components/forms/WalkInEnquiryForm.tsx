"use client";

import { useState } from "react";
import { CheckCircle2, Store } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { SHOWROOM_PAYMENT_MODE_OPTIONS } from "@/lib/showroom-walk-ins";

export function WalkInEnquiryForm() {
  const today = new Date().toISOString().slice(0, 10);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const payload = {
      enquiryDate: formData.get("enquiryDate"),
      name: formData.get("name"),
      requiredModel: formData.get("requiredModel"),
      contactNumber: formData.get("contactNumber") || undefined,
      address: formData.get("address") || undefined,
      paymentMode: formData.get("paymentMode") || undefined,
      expectedPurchaseDate: formData.get("expectedPurchaseDate") || undefined,
    };

    try {
      const res = await fetch("/api/showroom-walk-ins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (!res.ok) {
        const detail = data.details?.[0]?.message;
        toast.error(detail ?? data.error ?? "Could not submit enquiry");
        return;
      }

      setSubmitted(true);
      toast.success("Walk-in enquiry submitted");
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (submitted) {
    return (
      <div className="rounded-xl border border-green-700/40 bg-green-950/20 p-6 text-center">
        <CheckCircle2 className="mx-auto mb-3 h-10 w-10 text-green-400" />
        <h3 className="text-lg font-semibold text-white">Enquiry recorded</h3>
        <p className="mt-2 text-sm text-slate-400">
          Thank you for visiting our showroom. Our sales team will follow up with you shortly.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-red-700/30 bg-red-950/10 p-6">
      <div className="mb-4 flex items-start gap-3">
        <Store className="mt-0.5 h-5 w-5 shrink-0 text-red-400" />
        <div>
          <h2 className="text-lg font-semibold text-white">Showroom walk-in enquiry</h2>
          <p className="mt-1 text-sm text-slate-400">
            Visiting our showroom for a vehicle purchase? Share your details and we&apos;ll assist
            you.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          id="walkin-enquiryDate"
          name="enquiryDate"
          type="date"
          label="Walk-in date"
          defaultValue={today}
          required
        />
        <Input
          id="walkin-name"
          name="name"
          label="Name"
          placeholder="Your full name"
          required
        />
        <Input
          id="walkin-requiredModel"
          name="requiredModel"
          label="Required model"
          placeholder="e.g. Yakuza Rubie"
          required
        />
        <Input
          id="walkin-contactNumber"
          name="contactNumber"
          type="tel"
          label="Contact number"
          placeholder="10-digit mobile number"
        />
        <div>
          <label htmlFor="walkin-address" className="mb-1 block text-sm font-medium text-slate-300">
            Address
          </label>
          <textarea
            id="walkin-address"
            name="address"
            rows={2}
            placeholder="Locality, city"
            className="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-white placeholder:text-slate-500 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
          />
        </div>
        <Select
          id="walkin-paymentMode"
          name="paymentMode"
          label="Mode of payment"
          placeholder="Select payment mode"
          options={SHOWROOM_PAYMENT_MODE_OPTIONS}
        />
        <Input
          id="walkin-expectedPurchaseDate"
          name="expectedPurchaseDate"
          type="date"
          label="Expected date to purchase"
        />
        <Button type="submit" loading={loading} className="w-full sm:w-auto">
          Submit walk-in enquiry
        </Button>
      </form>
    </div>
  );
}
