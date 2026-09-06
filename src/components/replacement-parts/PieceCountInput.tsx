"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";

export function PieceCountInput({
  id,
  name,
  value,
  onChange,
  onBlur,
  disabled,
}: {
  id: string;
  name?: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  disabled?: boolean;
}) {
  return (
    <input
      id={id}
      name={name}
      type="number"
      min={1}
      step={1}
      inputMode="numeric"
      aria-label="No. of pieces"
      value={value}
      disabled={disabled}
      onChange={(event) => onChange(event.target.value)}
      onBlur={onBlur}
      className="w-20 rounded-lg border border-slate-600 bg-slate-900 px-2 py-1.5 text-center text-white placeholder:text-slate-500 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500 disabled:opacity-60"
    />
  );
}

export function EditablePieceCount({
  claimId,
  initial,
  onSaved,
}: {
  claimId: string;
  initial: number;
  onSaved: () => void;
}) {
  const [value, setValue] = useState(String(Math.max(1, initial)));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setValue(String(Math.max(1, initial)));
  }, [initial]);

  async function save() {
    const quantity = Math.max(1, Math.trunc(Number(value) || 0));
    setValue(String(quantity));
    if (quantity === initial) return;

    setSaving(true);
    try {
      const res = await fetch("/api/replacement-parts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          updatePieceCounts: true,
          quantities: [{ id: claimId, quantity }],
        }),
      });
      const result = await res.json();
      if (!res.ok) {
        toast.error(result.error ?? "Failed to update quantity");
        setValue(String(initial));
        return;
      }
      toast.success("Quantity updated");
      onSaved();
    } catch {
      toast.error("Something went wrong");
      setValue(String(initial));
    } finally {
      setSaving(false);
    }
  }

  return (
    <PieceCountInput
      id={`pieces-${claimId}`}
      value={value}
      onChange={setValue}
      onBlur={() => void save()}
      disabled={saving}
    />
  );
}
