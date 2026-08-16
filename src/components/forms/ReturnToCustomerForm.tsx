"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import {
  formatReplacementItemType,
  type SerializedReplacementClaim,
} from "@/lib/replacement-parts";

interface ReturnToCustomerFormProps {
  claims: SerializedReplacementClaim[];
  onSuccess: () => void;
  onCancel: () => void;
}

function summarizeNewItems(claim: SerializedReplacementClaim): string {
  const newItems = claim.items.filter((item) => item.side === "new");
  if (newItems.length === 0) return "—";
  return newItems
    .map(
      (item) =>
        `${formatReplacementItemType(item.itemType)}${item.modelCode ? ` (${item.modelCode})` : ""}${item.serialNumber ? ` / ${item.serialNumber}` : ""}`,
    )
    .join(", ");
}

export function ReturnToCustomerForm({ claims, onSuccess, onCancel }: ReturnToCustomerFormProps) {
  const [loading, setLoading] = useState(false);
  const today = new Date().toISOString().slice(0, 10);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const payload = {
      returnToCustomer: true,
      ids: claims.map((claim) => claim.id),
      returnedToCustomerDate: formData.get("returnedToCustomerDate"),
      handoverNote: formData.get("handoverNote") || undefined,
    };

    try {
      const res = await fetch("/api/replacement-parts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await res.json();

      if (!res.ok) {
        toast.error(result.error ?? "Failed to record return to customer");
        return;
      }

      toast.success(
        result.updated === 1
          ? "Item returned to customer"
          : `${result.updated} claims returned to customers`,
      );
      onSuccess();
    } catch {
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal open title="Return replacement to customer" onClose={onCancel}>
      <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-100">
          <p className="font-medium">
            {claims.length === 1
              ? claims[0].customerName
              : `${claims.length} customers waiting for handover`}
          </p>
          <ul className="mt-2 space-y-1 text-xs text-emerald-200/80">
            {claims.map((claim) => (
              <li key={claim.id}>
                {claim.customerName}: {summarizeNewItems(claim)}
              </li>
            ))}
          </ul>
        </div>

        <Input
          id="returnedToCustomerDate"
          name="returnedToCustomerDate"
          type="date"
          label="Returned to customer date"
          defaultValue={today}
          required
        />
        <Input
          id="handoverNote"
          name="handoverNote"
          label="Handover note (optional)"
          placeholder="e.g. Customer collected from showroom"
        />

        <p className="text-xs text-slate-400">
          This closes the replacement cycle: received from company → handed back to customer.
        </p>

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" loading={loading}>
            Mark as returned
          </Button>
        </div>
      </form>
    </Modal>
  );
}
