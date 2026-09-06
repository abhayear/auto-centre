"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import {
  claimPieceCount,
  formatReplacementItemType,
  type SerializedReplacementClaim,
} from "@/lib/replacement-parts";

interface ReturnToCustomerFormProps {
  claims: SerializedReplacementClaim[];
  onSuccess: () => void;
  onCancel: () => void;
}

function todayStamp() {
  return new Date().toISOString().slice(0, 10);
}

function summarizeHandoverItem(claim: SerializedReplacementClaim): string {
  const allocated = claim.allocatedStock[0];
  if (allocated) {
    return `${formatReplacementItemType(allocated.itemType)} · ${allocated.modelCode ?? "No code"}`;
  }
  const newItem = claim.items.find((item) => item.side === "new");
  if (newItem) {
    return `${formatReplacementItemType(newItem.itemType)}${newItem.modelCode ? ` · ${newItem.modelCode}` : ""}${newItem.serialNumber ? ` / ${newItem.serialNumber}` : ""}`;
  }
  const oldItem = claim.items.find((item) => item.side === "old");
  return oldItem
    ? `${formatReplacementItemType(oldItem.itemType)} · ${oldItem.modelCode ?? "No code"}`
    : "No item";
}

export function ReturnToCustomerForm({ claims, onSuccess, onCancel }: ReturnToCustomerFormProps) {
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [returnedToCustomerDate, setReturnedToCustomerDate] = useState(todayStamp);
  const [handoverNote, setHandoverNote] = useState("");

  async function returnClaim(claimIds: string[]) {
    const key = claimIds.length === 1 ? claimIds[0] : "all";
    setLoadingId(key);
    try {
      const res = await fetch("/api/replacement-parts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          returnToCustomer: true,
          ids: claimIds,
          returnedToCustomerDate,
          handoverNote: handoverNote.trim() || undefined,
        }),
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
      setLoadingId(null);
    }
  }

  return (
    <Modal open title="Return replacement to customer" onClose={onCancel}>
      <div className="max-h-[70vh] space-y-4 overflow-y-auto pr-1">
        {claims.length === 0 ? (
          <p className="text-sm text-slate-400">No allocated customers are waiting for return.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-slate-700/50">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-800/80 text-slate-300">
                <tr>
                  <th className="px-3 py-2 font-medium">Customer</th>
                  <th className="px-3 py-2 font-medium">Item</th>
                  <th className="px-3 py-2 font-medium">No. of pieces</th>
                  <th className="px-3 py-2 font-medium">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50 text-slate-300">
                {claims.map((claim) => (
                  <tr key={claim.id}>
                    <td className="px-3 py-3 align-top">
                      <p className="font-medium text-white">
                        {claim.caseNumber ?? "—"} · {claim.customerName}
                      </p>
                    </td>
                    <td className="px-3 py-3 align-top">{summarizeHandoverItem(claim)}</td>
                    <td className="px-3 py-3 align-top font-medium text-white">
                      {Math.max(1, claimPieceCount(claim))}
                    </td>
                    <td className="px-3 py-3 align-top">
                      <Button
                        type="button"
                        size="sm"
                        loading={loadingId === claim.id}
                        onClick={() => void returnClaim([claim.id])}
                      >
                        Return
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <Input
          id="returnedToCustomerDate"
          name="returnedToCustomerDate"
          type="date"
          label="Returned to customer date"
          value={returnedToCustomerDate}
          onChange={(event) => setReturnedToCustomerDate(event.target.value)}
          required
        />
        <Input
          id="handoverNote"
          name="handoverNote"
          label="Handover note (optional)"
          placeholder="e.g. Customer collected from showroom"
          value={handoverNote}
          onChange={(event) => setHandoverNote(event.target.value)}
        />

        <p className="text-xs text-slate-400">
          Return marks the allocated item as handed back and closes the warranty case.
        </p>

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="ghost" onClick={onCancel}>
            Close
          </Button>
          {claims.length > 1 ? (
            <Button
              type="button"
              loading={loadingId === "all"}
              onClick={() => void returnClaim(claims.map((claim) => claim.id))}
            >
              Return all
            </Button>
          ) : null}
        </div>
      </div>
    </Modal>
  );
}
