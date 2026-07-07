"use client";

import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import {
  computeCashBoxTotals,
  type CashBoxEntryInput,
} from "@/lib/cash-box";
import { formatPrice } from "@/lib/utils";

export type CashBoxRecordView = {
  id: string;
  recordDate: string;
  sessionNumber: number;
  openingBalance: number;
  takenHome: number;
  notes: string | null;
  entries: CashBoxEntryInput[];
};

type EntryRow = CashBoxEntryInput & { key: string };

const emptyEntry = (type: "receipt" | "payment"): EntryRow => ({
  key: crypto.randomUUID(),
  type,
  category: type === "receipt" ? "sale" : "expense",
  business: "autogalaxy",
  paymentMethod: "cash",
  description: "",
  amount: 0,
});

interface CashBoxFormProps {
  record?: CashBoxRecordView;
  onSuccess: () => void;
  onCancel: () => void;
}

export function CashBoxForm({ record, onSuccess, onCancel }: CashBoxFormProps) {
  const isEdit = !!record;
  const [loading, setLoading] = useState(false);
  const [recordDate, setRecordDate] = useState(
    record?.recordDate ?? new Date().toISOString().slice(0, 10),
  );
  const [sessionNumber, setSessionNumber] = useState(record?.sessionNumber ?? 1);
  const [openingBalance, setOpeningBalance] = useState(record?.openingBalance ?? 0);
  const [takenHome, setTakenHome] = useState(record?.takenHome ?? 0);
  const [notes, setNotes] = useState(record?.notes ?? "");
  const [entries, setEntries] = useState<EntryRow[]>(
    record?.entries.map((entry) => ({ ...entry, key: crypto.randomUUID() })) ?? [
      emptyEntry("receipt"),
    ],
  );

  const totals = useMemo(
    () => computeCashBoxTotals(openingBalance, takenHome, entries),
    [openingBalance, takenHome, entries],
  );

  function updateEntry(key: string, patch: Partial<EntryRow>) {
    setEntries((rows) => rows.map((row) => (row.key === key ? { ...row, ...patch } : row)));
  }

  function removeEntry(key: string) {
    setEntries((rows) => rows.filter((row) => row.key !== key));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const validEntries = entries.filter((entry) => entry.description.trim() && entry.amount > 0);
    if (validEntries.length === 0) {
      toast.error("Add at least one receipt or payment line");
      return;
    }

    setLoading(true);

    const payload = {
      recordDate,
      sessionNumber,
      openingBalance,
      takenHome,
      notes: notes.trim() || null,
      entries: validEntries.map(({ key: _key, ...entry }, index) => ({
        ...entry,
        description: entry.description.trim(),
        sortOrder: index,
      })),
    };

    try {
      const res = await fetch(isEdit ? `/api/cash-box/${record.id}` : "/api/cash-box", {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await res.json();

      if (!res.ok) {
        toast.error(result.error ?? "Failed to save cash box record");
        return;
      }

      toast.success(isEdit ? "Cash box updated" : "Cash box entry saved");
      onSuccess();
    } catch {
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal
      open
      onClose={onCancel}
      title={isEdit ? "Edit Cash Box Record" : "Add Cash Box Record"}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="max-h-[75vh] space-y-4 overflow-y-auto pr-1">
        <p className="text-sm text-slate-400">
          Enter daily cash balance in box — receipts (प्राप्ति), payments (भुगतान), and cash taken
          home.
        </p>

        <div className="grid gap-4 sm:grid-cols-3">
          <Input
            id="recordDate"
            type="date"
            label="Date"
            value={recordDate}
            onChange={(e) => setRecordDate(e.target.value)}
            required
          />
          <Input
            id="sessionNumber"
            type="number"
            label="Session"
            min={1}
            max={10}
            value={sessionNumber}
            onChange={(e) => setSessionNumber(Number(e.target.value) || 1)}
            required
          />
          <Input
            id="openingBalance"
            type="number"
            label="Opening balance in box (₹)"
            min={0}
            step="0.01"
            value={openingBalance}
            onChange={(e) => setOpeningBalance(Number(e.target.value) || 0)}
            required
          />
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white">Receipts & payments</h3>
            <div className="flex gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setEntries((rows) => [...rows, emptyEntry("receipt")])}>
                <Plus className="h-4 w-4" />
                Receipt
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => setEntries((rows) => [...rows, emptyEntry("payment")])}>
                <Plus className="h-4 w-4" />
                Payment
              </Button>
            </div>
          </div>

          {entries.map((entry) => (
            <div
              key={entry.key}
              className="grid gap-2 rounded-lg border border-slate-700 bg-slate-900/50 p-3 sm:grid-cols-12"
            >
              <div className="sm:col-span-2">
                <Select
                  id={`type-${entry.key}`}
                  label="Type"
                  value={entry.type}
                  onChange={(e) =>
                    updateEntry(entry.key, {
                      type: e.target.value as "receipt" | "payment",
                      category: e.target.value === "receipt" ? "sale" : "expense",
                    })
                  }
                  options={[
                    { value: "receipt", label: "Receipt" },
                    { value: "payment", label: "Payment" },
                  ]}
                />
              </div>
              <div className="sm:col-span-2">
                <Select
                  id={`category-${entry.key}`}
                  label="Category"
                  value={entry.category}
                  onChange={(e) => updateEntry(entry.key, { category: e.target.value as EntryRow["category"] })}
                  options={[
                    { value: "sale", label: "Sale" },
                    { value: "service", label: "Service" },
                    { value: "advance", label: "Advance" },
                    { value: "expense", label: "Expense" },
                    { value: "other", label: "Other" },
                  ]}
                />
              </div>
              <div className="sm:col-span-2">
                <Select
                  id={`business-${entry.key}`}
                  label="Business"
                  value={entry.business ?? "autogalaxy"}
                  onChange={(e) => updateEntry(entry.key, { business: e.target.value as EntryRow["business"] })}
                  options={[
                    { value: "autogalaxy", label: "Auto Galaxy" },
                    { value: "ecomotive", label: "Ecomotive" },
                    { value: "other", label: "Other" },
                  ]}
                />
              </div>
              <div className="sm:col-span-2">
                <Select
                  id={`method-${entry.key}`}
                  label="Method"
                  value={entry.paymentMethod ?? "cash"}
                  onChange={(e) =>
                    updateEntry(entry.key, { paymentMethod: e.target.value as EntryRow["paymentMethod"] })
                  }
                  options={[
                    { value: "cash", label: "Cash" },
                    { value: "phonepay", label: "PhonePe" },
                    { value: "other", label: "Other" },
                  ]}
                />
              </div>
              <div className="sm:col-span-3">
                <Input
                  id={`desc-${entry.key}`}
                  label="Description"
                  value={entry.description}
                  onChange={(e) => updateEntry(entry.key, { description: e.target.value })}
                  placeholder="e.g. Sale, welding, tea"
                />
              </div>
              <div className="sm:col-span-1">
                <Input
                  id={`amount-${entry.key}`}
                  type="number"
                  label="₹"
                  min={0}
                  step="0.01"
                  value={entry.amount || ""}
                  onChange={(e) => updateEntry(entry.key, { amount: Number(e.target.value) || 0 })}
                />
              </div>
              <div className="flex items-end sm:col-span-12 sm:justify-end">
                <Button type="button" variant="ghost" size="sm" onClick={() => removeEntry(entry.key)}>
                  <Trash2 className="h-4 w-4 text-red-400" />
                </Button>
              </div>
            </div>
          ))}
        </div>

        <Input
          id="takenHome"
          type="number"
          label="Cash taken home (₹)"
          min={0}
          step="0.01"
          value={takenHome}
          onChange={(e) => setTakenHome(Number(e.target.value) || 0)}
        />

        <div>
          <label htmlFor="notes" className="mb-1 block text-sm font-medium text-slate-300">
            Notes (optional)
          </label>
          <textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-white placeholder:text-slate-500 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
          />
        </div>

        <div className="rounded-lg border border-slate-700 bg-slate-950/60 p-4 text-sm">
          <p className="font-medium text-white">Cash balance in box</p>
          <div className="mt-2 grid gap-1 text-slate-300 sm:grid-cols-2">
            <span>Cash receipts: {formatPrice(totals.receipts)}</span>
            <span>Cash payments: {formatPrice(totals.payments)}</span>
            {totals.nonCashReceipts > 0 ? (
              <span>PhonePe / other (not in box): {formatPrice(totals.nonCashReceipts)}</span>
            ) : null}
            <span>Taken home: {formatPrice(takenHome)}</span>
            <span className="font-semibold text-red-400">
              Closing balance: {formatPrice(totals.closingBalance)}
            </span>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" loading={loading}>
            {isEdit ? "Update" : "Save"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
