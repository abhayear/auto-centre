"use client";

import { useMemo, useState } from "react";
import { InquiryForm } from "@/components/forms/InquiryForm";
import { Select } from "@/components/ui/Select";
import { formatPrice } from "@/lib/utils";

export type BookableVehicle = {
  id: string;
  label: string;
  onlineBookingRefund: number | null;
};

interface OnlineBookingFormProps {
  vehicles: BookableVehicle[];
  initialVehicleId?: string;
}

export function OnlineBookingForm({ vehicles, initialVehicleId }: OnlineBookingFormProps) {
  const defaultId =
    initialVehicleId && vehicles.some((v) => v.id === initialVehicleId)
      ? initialVehicleId
      : vehicles[0]?.id ?? "";

  const [selectedId, setSelectedId] = useState(defaultId);

  const selected = useMemo(
    () => vehicles.find((vehicle) => vehicle.id === selectedId),
    [selectedId, vehicles],
  );

  if (vehicles.length === 0) {
    return (
      <p className="text-sm text-slate-400">
        No electric scooters are available for online booking right now. Please check back
        soon or contact us.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <Select
        id="vehicle"
        label="Select e-scooter model"
        value={selectedId}
        onChange={(e) => setSelectedId(e.target.value)}
        options={vehicles.map((vehicle) => ({
          value: vehicle.id,
          label: vehicle.label,
        }))}
      />

      {selected?.onlineBookingRefund != null && selected.onlineBookingRefund > 0 && (
        <div className="rounded-lg border border-green-700/50 bg-green-900/20 px-4 py-3">
          <p className="font-medium text-green-300">
            Get {formatPrice(selected.onlineBookingRefund)} cash refund from Auto Galaxy when
            you complete this online booking
          </p>
        </div>
      )}

      <InquiryForm
        type="test_drive"
        vehicleId={selected?.id}
        vehicleLabel={selected?.label}
        onlineBookingRefund={selected?.onlineBookingRefund}
      />
    </div>
  );
}
