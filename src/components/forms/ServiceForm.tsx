"use client";

import { Service } from "@prisma/client";
import { useState } from "react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Textarea } from "@/components/ui/Textarea";

interface ServiceFormProps {
  service?: Service;
  onSuccess: () => void;
  onCancel: () => void;
}

export function ServiceForm({ service, onSuccess, onCancel }: ServiceFormProps) {
  const [loading, setLoading] = useState(false);
  const isEdit = !!service;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get("name"),
      description: formData.get("description"),
      estimatedPrice: Number(formData.get("estimatedPrice")),
      durationMinutes: Number(formData.get("durationMinutes")),
      active: formData.get("active") === "on",
    };

    try {
      const res = await fetch("/api/services", {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(isEdit ? { id: service.id, ...data } : data),
      });

      if (!res.ok) {
        const result = await res.json();
        toast.error(result.error ?? "Failed to save service");
        return;
      }

      toast.success(isEdit ? "Service updated" : "Service created");
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
      onClose={onCancel}
      title={isEdit ? "Edit Service" : "Add Service"}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input id="name" name="name" label="Name" defaultValue={service?.name} required />
        <Textarea
          id="description"
          name="description"
          label="Description"
          rows={3}
          defaultValue={service?.description}
          required
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            id="estimatedPrice"
            name="estimatedPrice"
            type="number"
            label="Estimated Price ($)"
            defaultValue={service?.estimatedPrice}
            required
          />
          <Input
            id="durationMinutes"
            name="durationMinutes"
            type="number"
            label="Duration (minutes)"
            defaultValue={service?.durationMinutes}
            required
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-300">
          <input
            type="checkbox"
            name="active"
            defaultChecked={service?.active ?? true}
            className="rounded border-slate-600 bg-slate-800 text-red-600 focus:ring-red-500"
          />
          Active
        </label>
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" loading={loading}>
            {isEdit ? "Update" : "Create"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
