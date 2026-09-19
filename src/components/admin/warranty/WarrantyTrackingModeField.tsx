"use client";

import {
  WARRANTY_SENT_BY_LABELS,
  normalizeWarrantyTrackingMode,
  type WarrantyTrackingMode,
} from "@/lib/warranty-tracking";

const CHOICES: { value: WarrantyTrackingMode; title: string; hint: string }[] = [
  {
    value: "serial",
    title: "Serial number",
    hint: "Each piece has its own serial. Type or scan one serial per item.",
  },
  {
    value: "batch",
    title: "Batch number",
    hint: "Several pieces left together, e.g. 4 batteries from one lot. Enter the batch and the quantity.",
  },
];

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
        <span className="mb-1 block text-sm font-medium text-slate-300">How these items are sent</span>
        {WARRANTY_SENT_BY_LABELS[mode]}
      </p>
    );
  }

  return (
    <fieldset className="space-y-2 sm:col-span-2">
      <legend className="text-sm font-medium text-slate-300">How these items are sent</legend>
      <input type="hidden" id={id} name="trackingMode" value={mode} />
      <div className="grid gap-2 sm:grid-cols-2">
        {CHOICES.map((choice) => {
          const selected = mode === choice.value;
          return (
            <button
              key={choice.value}
              type="button"
              disabled={disabled}
              onClick={() => onChange?.(choice.value)}
              className={`rounded-lg border px-3 py-3 text-left ${
                selected
                  ? "border-emerald-600 bg-emerald-950/40 text-white"
                  : "border-slate-600 bg-slate-900 text-slate-300 hover:border-slate-400"
              }`}
            >
              <p className="font-medium">{choice.title}</p>
              <p className="mt-1 text-xs text-slate-400">{choice.hint}</p>
            </button>
          );
        })}
      </div>
      <p className="text-xs text-slate-400">{WARRANTY_SENT_BY_LABELS[mode]}</p>
    </fieldset>
  );
}
