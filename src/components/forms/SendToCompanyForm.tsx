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

interface SendToCompanyFormProps {
  claims: SerializedReplacementClaim[];
  onSuccess: () => void;
  onCancel: () => void;
}

function summarizeItems(claim: SerializedReplacementClaim): string {
  return claim.items
    .filter((item) => item.side === "old")
    .map(
      (item) =>
        `${formatReplacementItemType(item.itemType)}${item.modelCode ? ` (${item.modelCode})` : ""} × ${item.quantity}`,
    )
    .join(", ");
}

export function SendToCompanyForm({ claims, onSuccess, onCancel }: SendToCompanyFormProps) {
  const [loading, setLoading] = useState(false);
  const today = new Date().toISOString().slice(0, 10);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const payload = {
      sendToCompany: true,
      ids: claims.map((claim) => claim.id),
      sentToCompanyDate: formData.get("sentToCompanyDate"),
      courierNote: formData.get("courierNote") || undefined,
    };

    try {
      const res = await fetch("/api/replacement-parts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await res.json();

      if (!res.ok) {
        toast.error(result.error ?? "Failed to send items to company");
        return;
      }

      toast.success(
        result.updated === 1
          ? "Item marked as sent to company"
          : `${result.updated} claims marked as sent to company`,
      );
      onSuccess();
    } catch {
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal open title="Send showroom items to company" onClose={onCancel}>
      <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
        <div className="rounded-lg border border-sky-500/30 bg-sky-500/10 p-3 text-sm text-sky-100">
          <p className="font-medium">
            {claims.length === 1
              ? claims[0].customerName
              : `${claims.length} claims at showroom`}
          </p>
          <ul className="mt-2 space-y-1 text-xs text-sky-200/80">
            {claims.map((claim) => (
              <li key={claim.id}>
                {claim.customerName}: {summarizeItems(claim) || "—"}
              </li>
            ))}
          </ul>
        </div>

        <Input
          id="sentToCompanyDate"
          name="sentToCompanyDate"
          type="date"
          label="Sent to company date"
          defaultValue={today}
          required
        />
        <Input
          id="courierNote"
          name="courierNote"
          label="Courier / tracking (optional)"
          placeholder="e.g. DTDC, AWB 921949267"
        />

        <p className="text-xs text-slate-400">
          After you save, these items move from At showroom to Pending from company. Print the
          company letter before or after sending.
        </p>

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" loading={loading}>
            Mark as sent
          </Button>
        </div>
      </form>
    </Modal>
  );
}
