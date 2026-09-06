"use client";

import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import { PieceCountInput } from "@/components/replacement-parts/PieceCountInput";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import {
  claimPieceCount,
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
  const [quantities, setQuantities] = useState<Record<string, string>>({});
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

  function pieceValue(claim: SerializedReplacementClaim) {
    return quantities[claim.id] ?? String(Math.max(1, claimPieceCount(claim)));
  }

  async function allocate(claim: SerializedReplacementClaim, stockId: string) {
    setLoadingId(claim.id);
    try {
      const res = await fetch("/api/replacement-parts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          allocateStock: true,
          claimId: claim.id,
          stockId,
          quantity: Math.max(1, Math.trunc(Number(pieceValue(claim)) || 0)),
        }),
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
          <div className="overflow-x-auto rounded-lg border border-slate-700/50">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-800/80 text-slate-300">
                <tr>
                  <th className="px-3 py-2 font-medium">Customer</th>
                  <th className="px-3 py-2 font-medium">Item</th>
                  <th className="px-3 py-2 font-medium">No. of pieces</th>
                  <th className="px-3 py-2 font-medium">Recommendation</th>
                  <th className="px-3 py-2 font-medium">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50 text-slate-300">
                {pending.map((claim) => {
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
                      quantity={pieceValue(claim)}
                      manualStockId={manualByClaim[claim.id] ?? ""}
                      loading={loadingId === claim.id}
                      onQuantityChange={(value) =>
                        setQuantities((current) => ({ ...current, [claim.id]: value }))
                      }
                      onManualChange={(value) =>
                        setManualByClaim((current) => ({ ...current, [claim.id]: value }))
                      }
                      onAllocate={(stockId) => void allocate(claim, stockId)}
                    />
                  );
                })}
              </tbody>
            </table>
          </div>
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
  quantity,
  manualStockId,
  loading,
  onQuantityChange,
  onManualChange,
  onAllocate,
}: {
  claim: SerializedReplacementClaim;
  recommendation: AllocationRecommendation;
  available: SerializedReplacementStockItem[];
  quantity: string;
  manualStockId: string;
  loading: boolean;
  onQuantityChange: (value: string) => void;
  onManualChange: (value: string) => void;
  onAllocate: (stockId: string) => void;
}) {
  const oldItem = claim.items.find((item) => item.side === "old");
  const stockId = recommendation.stockId ?? manualStockId;
  return (
    <tr>
      <td className="px-3 py-3 align-top">
        <p className="font-medium text-white">
          {claim.caseNumber ?? "—"} · {claim.customerName}
        </p>
        {recommendation.urgent ? (
          <p className="mt-1 text-xs text-red-300">
            Urgent
            {recommendation.remainingMonths != null
              ? ` · ${recommendation.remainingMonths} months left`
              : ""}
          </p>
        ) : (
          <p className="mt-1 text-xs text-green-300">
            Normal
            {recommendation.remainingMonths != null
              ? ` · ${recommendation.remainingMonths} months left`
              : ""}
          </p>
        )}
      </td>
      <td className="px-3 py-3 align-top">
        {oldItem
          ? `${formatReplacementItemType(oldItem.itemType)} · ${oldItem.modelCode ?? "No code"}`
          : "No submitted item"}
      </td>
      <td className="px-3 py-3 align-top">
        <PieceCountInput
          id={`pieces-${claim.id}`}
          value={quantity}
          onChange={onQuantityChange}
        />
      </td>
      <td className="px-3 py-3 align-top">
        <p>{recommendation.reason}</p>
        {recommendation.kind === "wait" && available.length > 0 && (
          <div className="mt-2 min-w-52">
            <Select
              id={`manual-${claim.id}`}
              label="Or pick stock manually"
              placeholder="Select available stock"
              value={manualStockId}
              onChange={(event) => onManualChange(event.target.value)}
              options={available.map((item) => ({
                value: item.id,
                label: `${item.modelCode ?? "No code"} · ${formatReplacementItemType(item.itemType)} · 1 piece`,
              }))}
            />
          </div>
        )}
      </td>
      <td className="px-3 py-3 align-top">
        <Button
          type="button"
          size="sm"
          disabled={!stockId}
          loading={loading}
          onClick={() => stockId && onAllocate(stockId)}
        >
          Allocate
        </Button>
      </td>
    </tr>
  );
}
