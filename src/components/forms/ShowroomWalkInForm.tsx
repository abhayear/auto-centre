"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { SHOWROOM_PAYMENT_MODE_OPTIONS } from "@/lib/showroom-walk-ins";

export type ShowroomWalkInView = {
  id: string;
  enquiryDate: string;
  name: string;
  requiredModel: string;
  contactNumber: string | null;
  address: string | null;
  paymentMode: string | null;
  expectedPurchaseDate: string | null;
};

interface ShowroomWalkInFormProps {
  enquiry?: ShowroomWalkInView;
  onSuccess: () => void;
  onCancel: () => void;
}

export function ShowroomWalkInForm({ enquiry, onSuccess, onCancel }: ShowroomWalkInFormProps) {
  const [loading, setLoading] = useState(false);
  const isEdit = !!enquiry;
  const today = new Date().toISOString().slice(0, 10);

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
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(isEdit ? { id: enquiry.id, ...payload } : payload),
      });
      const result = await res.json();

      if (!res.ok) {
        toast.error(result.error ?? "Failed to save enquiry");
        return;
      }

      toast.success(isEdit ? "Enquiry updated" : "Enquiry added");
      onSuccess();
    } catch {
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal
      open
      title={isEdit ? "Edit walk-in enquiry" : "Add walk-in enquiry"}
      onClose={onCancel}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          id="enquiryDate"
          name="enquiryDate"
          type="date"
          label="Walk-in date"
          defaultValue={enquiry?.enquiryDate ?? today}
          required
        />
        <Input
          id="name"
          name="name"
          label="Name"
          defaultValue={enquiry?.name}
          required
        />
        <Input
          id="requiredModel"
          name="requiredModel"
          label="Required model"
          defaultValue={enquiry?.requiredModel}
          required
        />
        <Input
          id="contactNumber"
          name="contactNumber"
          type="tel"
          label="Contact number"
          defaultValue={enquiry?.contactNumber ?? ""}
        />
        <div>
          <label htmlFor="address" className="mb-1 block text-sm font-medium text-slate-300">
            Address
          </label>
          <textarea
            id="address"
            name="address"
            rows={2}
            defaultValue={enquiry?.address ?? ""}
            className="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-white placeholder:text-slate-500 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
          />
        </div>
        <Select
          id="paymentMode"
          name="paymentMode"
          label="Mode of payment"
          placeholder="Select payment mode"
          defaultValue={enquiry?.paymentMode ?? ""}
          options={SHOWROOM_PAYMENT_MODE_OPTIONS}
        />
        <Input
          id="expectedPurchaseDate"
          name="expectedPurchaseDate"
          type="date"
          label="Expected date to purchase"
          defaultValue={enquiry?.expectedPurchaseDate ?? ""}
        />
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" loading={loading}>
            {isEdit ? "Save changes" : "Add enquiry"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
