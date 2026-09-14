"use client";

import { FormEvent, useState } from "react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  MECHANIC_EXPERTISE,
  MECHANIC_EXPERTISE_LABELS,
  MECHANIC_REFERRAL_LABOUR_OFF_RUPEES,
  MECHANIC_REFERRAL_STAY_DAYS,
  referralFromFormData,
} from "@/lib/mechanic-referral";

export function MechanicReferralForm() {
  const [saving, setSaving] = useState(false);
  const [formKey, setFormKey] = useState(0);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const payload = referralFromFormData(new FormData(event.currentTarget));
    if (payload.expertise.length === 0) {
      toast.error("Select at least one expertise");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/mechanic-referrals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await res.json();
      if (!res.ok) {
        const first = Array.isArray(result.details) ? result.details[0]?.message : null;
        toast.error(first ?? result.error ?? "Could not save referral");
        return;
      }
      toast.success(
        `Thank you. If this mechanic joins and stays ${MECHANIC_REFERRAL_STAY_DAYS} days, you get ₹${MECHANIC_REFERRAL_LABOUR_OFF_RUPEES} off your next labour bill.`,
      );
      setFormKey((current) => current + 1);
    } catch {
      toast.error("Could not save referral. Try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form key={formKey} onSubmit={handleSubmit} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <Input id="referrerName" name="referrerName" label="Your name" required autoComplete="name" placeholder="Customer name" />
        <Input
          id="referrerContact"
          name="referrerContact"
          label="Your mobile number"
          required
          autoComplete="tel"
          inputMode="tel"
          placeholder="10-digit mobile number"
        />
      </div>
      <Input id="name" name="name" label="Mechanic name" required placeholder="Full name" />
      <Input
        id="contactNo"
        name="contactNo"
        label="Mechanic contact number"
        required
        inputMode="tel"
        placeholder="10-digit mobile number"
      />
      <div className="space-y-1">
        <label htmlFor="address" className="block text-sm font-medium text-slate-300">
          Mechanic address
        </label>
        <textarea
          id="address"
          name="address"
          required
          rows={3}
          className="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-white placeholder:text-slate-500 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
          placeholder="House / street, area, city"
        />
      </div>
      <Input
        id="yearsOfExpertise"
        name="yearsOfExpertise"
        label="Years of expertise"
        type="number"
        min={0}
        max={60}
        required
        placeholder="e.g. 8"
      />
      <fieldset className="rounded-xl border border-slate-700/60 bg-slate-900/40 p-4">
        <legend className="px-1 text-sm font-medium text-white">Expertise</legend>
        <p className="mb-3 text-xs text-slate-500">Select every repair skill this mechanic has.</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {MECHANIC_EXPERTISE.map((value) => (
            <label key={value} className="flex items-center gap-2 text-sm text-slate-300">
              <input
                type="checkbox"
                name="expertise"
                value={value}
                className="rounded border-slate-600 bg-slate-800 text-red-600 focus:ring-red-500"
              />
              {MECHANIC_EXPERTISE_LABELS[value]}
            </label>
          ))}
        </div>
      </fieldset>
      <div className="flex justify-end">
        <Button type="submit" loading={saving}>
          Submit referral
        </Button>
      </div>
    </form>
  );
}
