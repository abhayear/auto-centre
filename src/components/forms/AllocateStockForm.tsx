"use client";

import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import {
  formatReplacementItemType,
  type SerializedReplacementClaim,
  type SerializedReplacementStockItem,
} from "@/lib/replacement-parts";
import {
  claimToAllocationClaim,
  recommendAllocation,
  type AllocationRecommendation,
} from "@/lib/warranty-allocation";

function todayStamp() {
  return new Date().toISOString().slice(0, 10);
}

export function AllocateStockForm({
  claims,
  stock,
  onSuccess,
  onCancel,
}: {
  claims: SerializedReplacementClaim[];
  stock: SerializedReplacementStockItem[];
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [manualByClaim, setManualByClaim] = useState<Record<string, string>>({});
  const today = todayStamp();

  const pending = useMemo(
    () =>
      claims.filter(
        (claim) =>
          !["returned_to_customer", "closed", "cancelled"].includes(claim.status) &&
          !claim.allocatedStockId,
      ),
    [claims],
  );

  const available = useMemo(
    () => stock.filter((item) => item.status === "available"),
    [stock],
  );

  async function allocate(claimId: string, stockId: string) {
    setLoadingId(claimId);
    try {
      const res = await fetch("/api/replacement-parts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ allocateStock: true, claimId, stockId }),
      });
      const result = await res.json();
      if (!res.ok) {
        toast.error(result.error ?? "Failed to allocate stock");
        return;
      }
      toast.success("Item allocated to customer");
      onSuccess();
    } catch {
      toast.error("Something went wrong");
    } finally {
      setLoadingId(null);
    }
  }

  return (
    <Modal open title="Allocate repaired stock" onClose={onCancel}>
      <div className="max-h-[70vh] space-y-4 overflow-y-auto pr-1">
        {pending.length === 0 ? (
          <p className="text-sm text-slate-400">No pending customers need allocation.</p>
        ) : (
          pending.map((claim) => {
            const recommendation = recommendAllocation(
              claimToAllocationClaim(claim),
              available,
              today,
            );
            return (
              <AllocationRow
                key={claim.id}
                claim={claim}
                recommendation={recommendation}
                available={available}
                manualStockId={manualByClaim[claim.id] ?? ""}
                loading={loadingId === claim.id}
                onManualChange={(value) =>
                  setManualByClaim((current) => ({ ...current, [claim.id]: value }))
                }
                onAllocate={(stockId) => void allocate(claim.id, stockId)}
              />
            );
          })
        )}
        <div className="flex justify-end">
          <Button type="button" variant="ghost" onClick={onCancel}>
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function AllocationRow({
  claim,
  recommendation,
  available,
  manualStockId,
  loading,
  onManualChange,
  onAllocate,
}: {
  claim: SerializedReplacementClaim;
  recommendation: AllocationRecommendation;
  available: SerializedReplacementStockItem[];
  manualStockId: string;
  loading: boolean;
  onManualChange: (value: string) => void;
  onAllocate: (stockId: string) => void;
}) {
  const oldItem = claim.items.find((item) => item.side === "old");
  const stockId = recommendation.stockId ?? manualStockId;
  return (
    <div className="space-y-3 rounded-lg border border-slate-700/50 bg-slate-900/50 p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-medium text-white">
            {claim.caseNumber ?? "—"} · {claim.customerName}
          </p>
          <p className="text-sm text-slate-400">
            {oldItem
              ? `${formatReplacementItemType(oldItem.itemType)} · ${oldItem.modelCode ?? "No code"}`
              : "No submitted item"}
          </p>
        </div>
        {recommendation.urgent ? (
          <span className="rounded-full bg-red-900/50 px-2.5 py-0.5 text-xs font-medium text-red-300">
            Urgent warranty
            {recommendation.remainingMonths != null
              ? ` · ${recommendation.remainingMonths} months left`
              : ""}
          </span>
        ) : (
          <span className="rounded-full bg-green-900/50 px-2.5 py-0.5 text-xs font-medium text-green-300">
            Normal warranty
            {recommendation.remainingMonths != null
              ? ` · ${recommendation.remainingMonths} months left`
              : ""}
          </span>
        )}
      </div>
      <p className="text-sm text-slate-300">{recommendation.reason}</p>
      {recommendation.kind === "wait" && available.length > 0 && (
        <Select
          id={`manual-${claim.id}`}
          label="Or pick stock manually"
          placeholder="Select available stock"
          value={manualStockId}
          onChange={(event) => onManualChange(event.target.value)}
          options={available.map((item) => ({
            value: item.id,
            label: `${item.modelCode ?? "No code"} · ${formatReplacementItemType(item.itemType)}`,
          }))}
        />
      )}
      <Button
        type="button"
        disabled={!stockId}
        loading={loading}
        onClick={() => stockId && onAllocate(stockId)}
      >
        Allocate
      </Button>
    </div>
  );
}
