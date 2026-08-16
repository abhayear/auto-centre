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
  REPLACEMENT_VOLTAGE_OPTIONS,
  formatReplacementItemType,
  pendingFromCompanySummary,
  type SerializedReplacementClaim,
} from "@/lib/replacement-parts";

type ItemDraft = {
  key: string;
  itemType: string;
  modelCode: string;
  serialNumber: string;
  ah: string;
  voltage: string;
  quantity: string;
  notes: string;
};

function createEmptyItem(index: number): ItemDraft {
  return {
    key: `new-${Date.now()}-${index}`,
    itemType: "battery",
    modelCode: "",
    serialNumber: "",
    ah: "",
    voltage: "",
    quantity: "1",
    notes: "",
  };
}

interface CompanyReceiptFormProps {
  claim: SerializedReplacementClaim;
  onSuccess: () => void;
  onCancel: () => void;
}

export function CompanyReceiptForm({ claim, onSuccess, onCancel }: CompanyReceiptFormProps) {
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<ItemDraft[]>([createEmptyItem(0)]);
  const today = new Date().toISOString().slice(0, 10);
  const oldItems = claim.items.filter((item) => item.side === "old");

  function addItem() {
    setItems((current) => [...current, createEmptyItem(current.length)]);
  }

  function removeItem(key: string) {
    setItems((current) => {
      const next = current.filter((item) => item.key !== key);
      return next.length > 0 ? next : [createEmptyItem(0)];
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
      recordCompanyReceipt: true,
      id: claim.id,
      companyReceivedDate: formData.get("companyReceivedDate"),
      companyInvoiceNumber: formData.get("companyInvoiceNumber") || undefined,
      companyDeliveryNote: formData.get("companyDeliveryNote") || undefined,
      items: items.map((item, index) => ({
        itemType: item.itemType,
        side: "new" as const,
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
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await res.json();

      if (!res.ok) {
        toast.error(result.error ?? "Failed to record company receipt");
        return;
      }

      toast.success("Company receipt recorded");
      onSuccess();
    } catch {
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal open title="Record items received from company" onClose={onCancel}>
      <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-100">
          <p className="font-medium">{claim.customerName}</p>
          <p className="mt-1 text-amber-200/80">{pendingFromCompanySummary(claim)}</p>
          {oldItems.length > 0 && (
            <p className="mt-2 text-xs text-amber-200/70">
              Faulty:{" "}
              {oldItems
                .map(
                  (item) =>
                    `${formatReplacementItemType(item.itemType)}${item.modelCode ? ` (${item.modelCode})` : ""}`,
                )
                .join(", ")}
            </p>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            id="companyReceivedDate"
            name="companyReceivedDate"
            type="date"
            label="Received from company date"
            defaultValue={claim.companyReceivedDate ?? today}
            required
          />
          <Input
            id="companyInvoiceNumber"
            name="companyInvoiceNumber"
            label="Company invoice / bill no. (optional)"
            placeholder="e.g. HR-AR/2526/6585"
            defaultValue={claim.companyInvoiceNumber ?? ""}
          />
          <Input
            id="companyDeliveryNote"
            name="companyDeliveryNote"
            label="Delivery note no. (optional)"
            placeholder="If no invoice, enter delivery note"
            defaultValue={claim.companyDeliveryNote ?? ""}
          />
        </div>

        <p className="text-xs text-slate-400">
          Invoice and delivery note are optional — use whichever document you received from Yakuza.
        </p>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white">Replacement items received</h3>
            <Button type="button" variant="outline" size="sm" onClick={addItem}>
              <Plus className="h-4 w-4" />
              Add item
            </Button>
          </div>

          {items.map((item) => (
            <div
              key={item.key}
              className="rounded-lg border border-slate-700/50 bg-slate-900/50 p-4 space-y-3"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium text-slate-300">New replacement item</p>
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
          ))}
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" loading={loading}>
            Save receipt
          </Button>
        </div>
      </form>
    </Modal>
  );
}
