"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import toast from "react-hot-toast";
import { History, IndianRupee, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { CashBoxHistoryModal } from "@/components/cash-box/CashBoxHistoryModal";
import { CashBoxForm, type CashBoxRecordView } from "@/components/forms/CashBoxForm";
import { canEditCashBox } from "@/lib/admin-roles";
import {
  formatCashBoxTimestamp,
  formatRecordDate,
  type SerializedCashBoxAuditLog,
} from "@/lib/cash-box";
import { formatPrice } from "@/lib/utils";

type CashBoxListItem = CashBoxRecordView & {
  receipts: number;
  payments: number;
  closingBalance: number;
  createdAt: string;
  updatedAt: string;
};

export default function AdminCashBoxPage() {
  const { data: session } = useSession();
  const canEdit = canEditCashBox(session?.user?.role ?? "manager");
  const [records, setRecords] = useState<CashBoxListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingRecord, setEditingRecord] = useState<CashBoxListItem | undefined>();
  const [historyRecord, setHistoryRecord] = useState<CashBoxListItem | undefined>();
  const [history, setHistory] = useState<SerializedCashBoxAuditLog[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  useEffect(() => {
    let active = true;

    async function load() {
      const res = await fetch("/api/cash-box");
      const data = await res.json();
      if (active) {
        setRecords(data);
        setLoading(false);
      }
    }

    load();
    return () => {
      active = false;
    };
  }, []);

  async function refreshRecords() {
    const res = await fetch("/api/cash-box");
    setRecords(await res.json());
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this cash box record?")) return;

    const res = await fetch(`/api/cash-box/${id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Record deleted");
      refreshRecords();
    } else {
      toast.error("Failed to delete record");
    }
  }

  async function handleViewHistory(record: CashBoxListItem) {
    setHistoryRecord(record);
    setHistoryLoading(true);
    try {
      const res = await fetch(`/api/cash-box/${record.id}`);
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Failed to load history");
        setHistoryRecord(undefined);
        return;
      }
      setHistory(Array.isArray(data.history) ? data.history : []);
    } catch {
      toast.error("Failed to load history");
      setHistoryRecord(undefined);
    } finally {
      setHistoryLoading(false);
    }
  }

  const latestBalance = records[0]?.closingBalance;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-red-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Cash Balance in Cash Box</h1>
          <p className="mt-1 text-sm text-slate-400">
            {canEdit
              ? "Daily cash box ledger — add, edit, and review balances"
              : "Add daily cash box entries and view closing balance"}
          </p>
        </div>
        <Button
          onClick={() => {
            setEditingRecord(undefined);
            setShowForm(true);
          }}
        >
          <Plus className="h-4 w-4" />
          Add entry
        </Button>
      </div>

      {latestBalance !== undefined ? (
        <div className="mb-6 rounded-xl border border-red-600/30 bg-red-600/10 p-5">
          <div className="flex items-center gap-3">
            <IndianRupee className="h-8 w-8 text-red-400" />
            <div>
              <p className="text-sm text-slate-300">Latest closing balance in box</p>
              <p className="text-3xl font-bold text-white">{formatPrice(latestBalance)}</p>
              <p className="text-xs text-slate-400">
                {formatRecordDate(records[0].recordDate)}
                {records[0].sessionNumber > 1 ? ` · Session ${records[0].sessionNumber}` : ""}
              </p>
            </div>
          </div>
        </div>
      ) : null}

      <div className="overflow-x-auto rounded-xl border border-slate-700/50">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-700 bg-slate-800/50">
            <tr>
              <th className="px-4 py-3 font-medium text-slate-300">Date</th>
              <th className="px-4 py-3 font-medium text-slate-300">Session</th>
              <th className="px-4 py-3 font-medium text-slate-300">Opening</th>
              <th className="px-4 py-3 font-medium text-slate-300">Receipts</th>
              <th className="px-4 py-3 font-medium text-slate-300">Payments</th>
              <th className="px-4 py-3 font-medium text-slate-300">Taken home</th>
              <th className="px-4 py-3 font-medium text-slate-300">Closing balance</th>
              <th className="px-4 py-3 font-medium text-slate-300">Last saved</th>
              <th className="px-4 py-3 font-medium text-slate-300">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700/50">
            {records.map((record) => (
              <tr key={record.id} className="hover:bg-slate-800/30">
                <td className="px-4 py-3 text-white">{formatRecordDate(record.recordDate)}</td>
                <td className="px-4 py-3 text-slate-300">{record.sessionNumber}</td>
                <td className="px-4 py-3 text-slate-300">{formatPrice(record.openingBalance)}</td>
                <td className="px-4 py-3 text-emerald-400">{formatPrice(record.receipts)}</td>
                <td className="px-4 py-3 text-amber-400">{formatPrice(record.payments)}</td>
                <td className="px-4 py-3 text-slate-300">{formatPrice(record.takenHome)}</td>
                <td className="px-4 py-3 font-semibold text-red-400">
                  {formatPrice(record.closingBalance)}
                </td>
                <td className="px-4 py-3 text-slate-300">
                  <p>{formatCashBoxTimestamp(record.updatedAt)}</p>
                  {record.createdAt !== record.updatedAt ? (
                    <p className="text-xs text-slate-500">
                      Created {formatCashBoxTimestamp(record.createdAt)}
                    </p>
                  ) : (
                    <p className="text-xs text-slate-500">Created</p>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      title="Edit history"
                      aria-label="Edit history"
                      onClick={() => void handleViewHistory(record)}
                    >
                      <History className="h-4 w-4" />
                    </Button>
                    {canEdit ? (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          title="Edit"
                          onClick={() => {
                            setEditingRecord(record);
                            setShowForm(true);
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          title="Delete"
                          onClick={() => handleDelete(record.id)}
                        >
                          <Trash2 className="h-4 w-4 text-red-400" />
                        </Button>
                      </>
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {records.length === 0 ? (
          <p className="py-8 text-center text-slate-400">
            No cash box records yet. Add your first daily entry.
          </p>
        ) : null}
      </div>

      {showForm && !editingRecord ? (
        <CashBoxForm
          onSuccess={() => {
            setShowForm(false);
            refreshRecords();
          }}
          onCancel={() => setShowForm(false)}
        />
      ) : null}

      {showForm && editingRecord && canEdit ? (
        <CashBoxForm
          record={editingRecord}
          onSuccess={() => {
            setShowForm(false);
            setEditingRecord(undefined);
            refreshRecords();
          }}
          onCancel={() => {
            setShowForm(false);
            setEditingRecord(undefined);
          }}
        />
      ) : null}

      {historyRecord ? (
        <CashBoxHistoryModal
          title={`History · ${formatRecordDate(historyRecord.recordDate)}${
            historyRecord.sessionNumber > 1 ? ` · session ${historyRecord.sessionNumber}` : ""
          }`}
          createdAt={historyRecord.createdAt}
          updatedAt={historyRecord.updatedAt}
          history={history}
          loading={historyLoading}
          onClose={() => {
            setHistoryRecord(undefined);
            setHistory([]);
          }}
        />
      ) : null}
    </div>
  );
}
