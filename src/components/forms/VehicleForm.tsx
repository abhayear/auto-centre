"use client";

import { Vehicle } from "@prisma/client";
import { useState } from "react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";

interface VehicleFormProps {
  vehicle?: Vehicle;
  onSuccess: () => void;
  onCancel: () => void;
}

export function VehicleForm({ vehicle, onSuccess, onCancel }: VehicleFormProps) {
  const [loading, setLoading] = useState(false);
  const isEdit = !!vehicle;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const imagesRaw = formData.get("images") as string;
    const images = imagesRaw
      .split("\n")
      .map((url) => url.trim())
      .filter(Boolean);

    const data = {
      make: formData.get("make"),
      model: formData.get("model"),
      year: Number(formData.get("year")),
      price: Number(formData.get("price")),
      mileage: Number(formData.get("mileage")),
      fuelType: formData.get("fuelType"),
      transmission: formData.get("transmission"),
      condition: formData.get("condition"),
      status: formData.get("status"),
      description: formData.get("description"),
      featured: formData.get("featured") === "on",
      images,
    };

    try {
      const url = isEdit ? `/api/vehicles/${vehicle.id}` : "/api/vehicles";
      const method = isEdit ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const result = await res.json();
        toast.error(result.error ?? "Failed to save vehicle");
        return;
      }

      toast.success(isEdit ? "Vehicle updated" : "Vehicle created");
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
      title={isEdit ? "Edit Vehicle" : "Add Vehicle"}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="max-h-[70vh] space-y-4 overflow-y-auto pr-2">
        <div className="grid gap-4 sm:grid-cols-2">
          <Input id="make" name="make" label="Make" defaultValue={vehicle?.make} required />
          <Input id="model" name="model" label="Model" defaultValue={vehicle?.model} required />
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <Input id="year" name="year" type="number" label="Year" defaultValue={vehicle?.year} required />
          <Input id="price" name="price" type="number" label="Price" defaultValue={vehicle?.price} required />
          <Input id="mileage" name="mileage" type="number" label="Mileage" defaultValue={vehicle?.mileage} required />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Select
            id="fuelType"
            name="fuelType"
            label="Fuel Type"
            defaultValue={vehicle?.fuelType}
            options={[
              { value: "Petrol", label: "Petrol" },
              { value: "Diesel", label: "Diesel" },
              { value: "Electric", label: "Electric" },
              { value: "Hybrid", label: "Hybrid" },
              { value: "Plug-in Hybrid", label: "Plug-in Hybrid" },
            ]}
          />
          <Select
            id="transmission"
            name="transmission"
            label="Transmission"
            defaultValue={vehicle?.transmission}
            options={[
              { value: "Automatic", label: "Automatic" },
              { value: "Manual", label: "Manual" },
              { value: "CVT", label: "CVT" },
            ]}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Select
            id="condition"
            name="condition"
            label="Condition"
            defaultValue={vehicle?.condition ?? "used"}
            options={[
              { value: "new", label: "New" },
              { value: "used", label: "Used" },
            ]}
          />
          <Select
            id="status"
            name="status"
            label="Status"
            defaultValue={vehicle?.status ?? "available"}
            options={[
              { value: "available", label: "Available" },
              { value: "sold", label: "Sold" },
              { value: "reserved", label: "Reserved" },
            ]}
          />
        </div>
        <Textarea
          id="description"
          name="description"
          label="Description"
          rows={3}
          defaultValue={vehicle?.description}
          required
        />
        <Textarea
          id="images"
          name="images"
          label="Image URLs (one per line)"
          rows={3}
          defaultValue={
            vehicle
              ? JSON.parse(vehicle.images).join("\n")
              : "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=800&q=80"
          }
        />
        <label className="flex items-center gap-2 text-sm text-slate-300">
          <input
            type="checkbox"
            name="featured"
            defaultChecked={vehicle?.featured}
            className="rounded border-slate-600 bg-slate-800 text-red-600 focus:ring-red-500"
          />
          Featured vehicle
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
