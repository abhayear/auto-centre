"use client";

import { Select } from "@/components/ui/Select";
import {
  WARRANTY_SENT_BY_LABELS,
  WARRANTY_TRACKING_MODE_OPTIONS,
  normalizeWarrantyTrackingMode,
  type WarrantyTrackingMode,
} from "@/lib/warranty-tracking";

export function WarrantyTrackingModeField({
  value,
  onChange,
  editable,
  disabled,
  id = "trackingMode",
}: {
  value: string;
  onChange?: (mode: WarrantyTrackingMode) => void;
  editable: boolean;
  disabled?: boolean;
  id?: string;
}) {
  const mode = normalizeWarrantyTrackingMode(value);

  if (!editable) {
    return (
      <p className="text-sm text-slate-300">
        <span className="mb-1 block text-sm font-medium text-slate-300">Sent by</span>
        {WARRANTY_SENT_BY_LABELS[mode]}
      </p>
    );
  }

  return (
    <div className="space-y-1">
      <Select
        id={id}
        name="trackingMode"
        label="Sent by"
        value={mode}
        disabled={disabled}
        onChange={(event) => onChange?.(normalizeWarrantyTrackingMode(event.target.value))}
        options={WARRANTY_TRACKING_MODE_OPTIONS}
      />
      <p className="text-xs text-slate-400">{WARRANTY_SENT_BY_LABELS[mode]}</p>
    </div>
  );
}
