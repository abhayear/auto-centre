"use client";

import { Vehicle } from "@prisma/client";
import { useState } from "react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/Button";
import { ImageUploader } from "@/components/forms/ImageUploader";
import { Modal } from "@/components/ui/Modal";
import { parseImages } from "@/lib/utils";

interface VehiclePhotoFormProps {
  vehicle: Vehicle;
  onSuccess: () => void;
  onCancel: () => void;
}

export function VehiclePhotoForm({ vehicle, onSuccess, onCancel }: VehiclePhotoFormProps) {
  const [loading, setLoading] = useState(false);
  const [images, setImages] = useState<string[]>(parseImages(vehicle.images));

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (images.length === 0) {
      toast.error("Upload at least one photo");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`/api/vehicles/${vehicle.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ images }),
      });

      if (!res.ok) {
        const result = await res.json();
        toast.error(result.error ?? "Failed to update photos");
        return;
      }

      toast.success("Photos updated");
      onSuccess();
    } catch {
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  const label = `${vehicle.year} ${vehicle.make} ${vehicle.model}`;

  return (
    <Modal open onClose={onCancel} title={`Update photo — ${label}`} size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="text-sm text-slate-400">
          Upload new photos for this e-bike. The first photo is shown on the website as the cover
          image.
        </p>
        <ImageUploader
          value={images}
          onChange={setImages}
          category="vehicles"
          label={`${vehicle.make} ${vehicle.model} photos`}
        />
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" loading={loading}>
            Update
          </Button>
        </div>
      </form>
    </Modal>
  );
}
