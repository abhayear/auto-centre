"use client";

import { EsteemedCustomer } from "@prisma/client";
import { useState } from "react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";

interface EsteemedCustomerFormProps {
  customer?: EsteemedCustomer;
  onSuccess: () => void;
  onCancel: () => void;
}

export function EsteemedCustomerForm({
  customer,
  onSuccess,
  onCancel,
}: EsteemedCustomerFormProps) {
  const [loading, setLoading] = useState(false);
  const isEdit = !!customer;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get("name"),
      designation: formData.get("designation") || undefined,
      locality: formData.get("locality") || undefined,
      vehicle: formData.get("vehicle") || undefined,
      note: formData.get("note") || undefined,
      sortOrder: Number(formData.get("sortOrder") || 0),
      active: formData.get("active") === "on",
    };

    try {
      const res = await fetch("/api/esteemed-customers", {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(isEdit ? { id: customer.id, ...data } : data),
      });

      const result = await res.json();

      if (!res.ok) {
        toast.error(result.error ?? "Failed to save customer");
        return;
      }

      toast.success(isEdit ? "Customer updated" : "Customer added");
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
      title={isEdit ? "Edit Esteemed Customer" : "Add Esteemed Customer"}
      onClose={onCancel}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          id="name"
          name="name"
          label="Customer name"
          placeholder="e.g. Rajesh Kumar"
          defaultValue={customer?.name}
          required
        />
        <Input
          id="designation"
          name="designation"
          label="Designation / role (optional)"
          placeholder="e.g. Fleet owner, Teacher, Shopkeeper"
          defaultValue={customer?.designation ?? ""}
        />
        <Input
          id="locality"
          name="locality"
          label="Locality (optional)"
          placeholder="e.g. Civil Line, Lalitpur"
          defaultValue={customer?.locality ?? ""}
        />
        <Input
          id="vehicle"
          name="vehicle"
          label="Vehicle (optional)"
          placeholder="e.g. Ola S1 Air, TVS iQube"
          defaultValue={customer?.vehicle ?? ""}
        />
        <div>
          <label htmlFor="note" className="mb-1 block text-sm font-medium text-slate-300">
            Note (optional)
          </label>
          <textarea
            id="note"
            name="note"
            rows={2}
            maxLength={300}
            placeholder="Short recognition line, e.g. Regular service customer since 2023"
            defaultValue={customer?.note ?? ""}
            className="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-white placeholder:text-slate-500 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
          />
        </div>
        <Input
          id="sortOrder"
          name="sortOrder"
          type="number"
          label="Display order (lower shows first)"
          min={0}
          defaultValue={customer?.sortOrder ?? 0}
        />
        <label className="flex items-center gap-2 text-sm text-slate-300">
          <input
            type="checkbox"
            name="active"
            defaultChecked={customer?.active ?? true}
            className="rounded border-slate-600 bg-slate-800 text-red-600"
          />
          Active — show on the website
        </label>
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" loading={loading}>
            {isEdit ? "Save Changes" : "Add Customer"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
