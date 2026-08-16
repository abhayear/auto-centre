"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import {
  REPLACEMENT_ITEM_TYPE_OPTIONS,
  REPLACEMENT_STATUS_OPTIONS,
  REPLACEMENT_VOLTAGE_OPTIONS,
  type SerializedReplacementClaim,
  type SerializedReplacementClaimItem,
} from "@/lib/replacement-parts";

export type ReplacementClaimView = SerializedReplacementClaim;

type ItemDraft = {
  key: string;
  itemType: string;
  side: "old" | "new";
  modelCode: string;
  serialNumber: string;
  ah: string;
  voltage: string;
  quantity: string;
  notes: string;
};

function createEmptyItem(side: "old" | "new", index: number): ItemDraft {
  return {
    key: `${side}-${Date.now()}-${index}`,
    itemType: "battery",
    side,
    modelCode: "",
    serialNumber: "",
    ah: "",
    voltage: "",
    quantity: "1",
    notes: "",
  };
}

function itemToDraft(item: SerializedReplacementClaimItem, index: number): ItemDraft {
  return {
    key: item.id || `item-${index}`,
    itemType: item.itemType,
    side: item.side,
    modelCode: item.modelCode ?? "",
    serialNumber: item.serialNumber ?? "",
    ah: item.ah != null ? String(item.ah) : "",
    voltage: item.voltage ?? "",
    quantity: String(item.quantity),
    notes: item.notes ?? "",
  };
}

function buildInitialItems(claim?: ReplacementClaimView): ItemDraft[] {
  if (claim?.items.length) {
    return claim.items.map(itemToDraft);
  }
  return [createEmptyItem("old", 0)];
}

interface ReplacementClaimFormProps {
  claim?: ReplacementClaimView;
  onSuccess: () => void;
  onCancel: () => void;
}

export function ReplacementClaimForm({ claim, onSuccess, onCancel }: ReplacementClaimFormProps) {
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<ItemDraft[]>(() => buildInitialItems(claim));
  const isEdit = !!claim;
  const today = new Date().toISOString().slice(0, 10);

  function addItem(side: "old" | "new") {
    setItems((current) => [...current, createEmptyItem(side, current.length)]);
  }

  function removeItem(key: string) {
    setItems((current) => {
      const next = current.filter((item) => item.key !== key);
      return next.length > 0 ? next : [createEmptyItem("old", 0)];
    });
  }

  function updateItem(key: string, field: keyof ItemDraft, value: string) {
    setItems((current) =>
      current.map((item) => (item.key === key ? { ...item, [field]: value } : item)),
    );
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const payload = {
      receivedDate: formData.get("receivedDate"),
      customerName: formData.get("customerName"),
      customerPhone: formData.get("customerPhone") || undefined,
      billNumber: formData.get("billNumber") || undefined,
      status: formData.get("status") || "received_from_customer",
      notes: formData.get("notes") || undefined,
      items: items.map((item, index) => ({
        itemType: item.itemType,
        side: item.side,
        modelCode: item.modelCode || undefined,
        serialNumber: item.serialNumber || undefined,
        ah: item.itemType === "battery" && item.ah ? Number(item.ah) : undefined,
        voltage: item.itemType === "charger" && item.voltage ? item.voltage : undefined,
        quantity: Number(item.quantity) || 1,
        notes: item.notes || undefined,
        sortOrder: index,
      })),
    };

    try {
      const res = await fetch("/api/replacement-parts", {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(isEdit ? { id: claim.id, ...payload } : payload),
      });
      const result = await res.json();

      if (!res.ok) {
        toast.error(result.error ?? "Failed to save claim");
        return;
      }

      toast.success(isEdit ? "Claim updated" : "Claim added");
      onSuccess();
    } catch {
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  function renderItemFields(item: ItemDraft) {
    return (
      <div
        key={item.key}
        className="rounded-lg border border-slate-700/50 bg-slate-900/50 p-4 space-y-3"
      >
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-medium text-slate-300">
            {item.side === "old" ? "Faulty item" : "Replacement item"}
          </p>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-red-400 hover:text-red-300"
            onClick={() => removeItem(item.key)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Select
            id={`itemType-${item.key}`}
            label="Item type"
            value={item.itemType}
            onChange={(e) => updateItem(item.key, "itemType", e.target.value)}
            options={REPLACEMENT_ITEM_TYPE_OPTIONS}
          />
          <Input
            id={`quantity-${item.key}`}
            type="number"
            min={1}
            label="Quantity"
            value={item.quantity}
            onChange={(e) => updateItem(item.key, "quantity", e.target.value)}
          />
          <Input
            id={`modelCode-${item.key}`}
            label="Model code"
            placeholder="e.g. LMKN/F2S/WB/12M"
            value={item.modelCode}
            onChange={(e) => updateItem(item.key, "modelCode", e.target.value)}
          />
          <Input
            id={`serialNumber-${item.key}`}
            label="Serial number"
            value={item.serialNumber}
            onChange={(e) => updateItem(item.key, "serialNumber", e.target.value)}
          />
          {item.itemType === "battery" && (
            <Input
              id={`ah-${item.key}`}
              type="number"
              step="0.1"
              label="AH"
              placeholder="e.g. 33.9"
              value={item.ah}
              onChange={(e) => updateItem(item.key, "ah", e.target.value)}
            />
          )}
          {item.itemType === "charger" && (
            <Select
              id={`voltage-${item.key}`}
              label="Voltage"
              placeholder="Select voltage"
              value={item.voltage}
              onChange={(e) => updateItem(item.key, "voltage", e.target.value)}
              options={REPLACEMENT_VOLTAGE_OPTIONS}
            />
          )}
        </div>
        <Input
          id={`notes-${item.key}`}
          label="Item notes"
          value={item.notes}
          onChange={(e) => updateItem(item.key, "notes", e.target.value)}
        />
      </div>
    );
  }

  const oldItems = items.filter((item) => item.side === "old");
  const newItems = items.filter((item) => item.side === "new");

  return (
    <Modal
      open
      title={isEdit ? "Edit replacement claim" : "Add replacement claim"}
      onClose={onCancel}
    >
      <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            id="receivedDate"
            name="receivedDate"
            type="date"
            label="Received date"
            defaultValue={claim?.receivedDate ?? today}
            required
          />
          <Select
            id="status"
            name="status"
            label="Status"
            defaultValue={claim?.status ?? "received_from_customer"}
            options={REPLACEMENT_STATUS_OPTIONS}
          />
          <Input
            id="customerName"
            name="customerName"
            label="Customer name"
            defaultValue={claim?.customerName}
            required
          />
          <Input
            id="customerPhone"
            name="customerPhone"
            type="tel"
            label="Phone"
            defaultValue={claim?.customerPhone ?? ""}
          />
          <Input
            id="billNumber"
            name="billNumber"
            label="Bill number"
            defaultValue={claim?.billNumber ?? ""}
          />
        </div>
        <div>
          <label htmlFor="notes" className="mb-1 block text-sm font-medium text-slate-300">
            Notes
          </label>
          <textarea
            id="notes"
            name="notes"
            rows={2}
            defaultValue={claim?.notes ?? ""}
            className="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-white placeholder:text-slate-500 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
          />
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white">Faulty items (old)</h3>
            <Button type="button" variant="outline" size="sm" onClick={() => addItem("old")}>
              <Plus className="h-4 w-4" />
              Add faulty item
            </Button>
          </div>
          {oldItems.map(renderItemFields)}
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white">Replacement items (new)</h3>
            <Button type="button" variant="outline" size="sm" onClick={() => addItem("new")}>
              <Plus className="h-4 w-4" />
              Add replacement item
            </Button>
          </div>
          {newItems.length === 0 ? (
            <p className="text-sm text-slate-500">
              Add replacement items when received from company.
            </p>
          ) : (
            newItems.map(renderItemFields)
          )}
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" loading={loading}>
            {isEdit ? "Save changes" : "Add claim"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
