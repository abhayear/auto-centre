"use client";

import { ServiceArea } from "@prisma/client";
import { useState } from "react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";

interface ServiceAreaFormProps {
  area?: ServiceArea;
  onSuccess: () => void;
  onCancel: () => void;
}

export function ServiceAreaForm({ area, onSuccess, onCancel }: ServiceAreaFormProps) {
  const [loading, setLoading] = useState(false);
  const isEdit = !!area;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get("name"),
      pinCode: formData.get("pinCode") || undefined,
      active: formData.get("active") === "on",
    };

    try {
      const res = await fetch("/api/service-areas", {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(isEdit ? { id: area.id, ...data } : data),
      });

      const result = await res.json();

      if (!res.ok) {
        toast.error(result.error ?? "Failed to save service area");
        return;
      }

      toast.success(isEdit ? "Service area updated" : "Service area added");
      onSuccess();
    } catch {
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal
      title={isEdit ? "Edit Service Area" : "Add Service Area"}
      onClose={onCancel}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          id="name"
          name="name"
          label="Area / Locality Name"
          placeholder="e.g. Lalitpur, Civil Line"
          defaultValue={area?.name}
          required
        />
        <Input
          id="pinCode"
          name="pinCode"
          label="Pin Code (optional)"
          placeholder="e.g. 284403"
          defaultValue={area?.pinCode ?? ""}
        />
        <label className="flex items-center gap-2 text-sm text-slate-300">
          <input
            type="checkbox"
            name="active"
            defaultChecked={area?.active ?? true}
            className="rounded border-slate-600 bg-slate-800 text-red-600"
          />
          Active — customers in this area can book service
        </label>
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" loading={loading}>
            {isEdit ? "Save Changes" : "Add Area"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
