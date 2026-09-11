"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import toast from "react-hot-toast";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { CreditNoteItcWizard, type CreditNoteItcFormValue } from "@/components/credit-note-itc/CreditNoteItcWizard";
import { isAdminRole } from "@/lib/admin-roles";
import {
  CREDIT_NOTE_ITC_STATUSES,
  type CreditNoteItcStatus,
  type SerializedCreditNoteItcCase,
} from "@/lib/credit-note-itc";
import { SITE_ADDRESS, SITE_NAME } from "@/lib/constants";
import { formatRecordDate } from "@/lib/cash-box";

const STATUS_OPTIONS = CREDIT_NOTE_ITC_STATUSES.map((value) => ({
  value,
  label: value.replaceAll("_", " "),
}));

export default function AdminCreditNoteItcPage() {
  const { data: session } = useSession();
  const canDelete = isAdminRole(session?.user?.role ?? "");
  const [records, setRecords] = useState<SerializedCreditNoteItcCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<SerializedCreditNoteItcCase | undefined>();

  async function refresh() {
    const res = await fetch("/api/credit-note-itc");
    setRecords(await res.json());
  }

  useEffect(() => {
    let active = true;
    fetch("/api/credit-note-itc")
      .then((res) => res.json())
      .then((data) => {
        if (active) {
          setRecords(data);
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, []);

  async function handleSave(payload: CreditNoteItcFormValue) {
    setSaving(true);
    try {
      const res = await fetch(editing ? `/api/credit-note-itc/${editing.id}` : "/api/credit-note-itc", {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await res.json();
      if (!res.ok) {
        toast.error(result.error ?? "Failed to save");
        return;
      }
      toast.success(editing ? "Case updated" : "Case saved");
      setShowForm(false);
      setEditing(undefined);
      await refresh();
    } finally {
      setSaving(false);
    }
  }

  async function handleStatus(id: string, status: CreditNoteItcStatus) {
    const res = await fetch(`/api/credit-note-itc/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) {
      toast.error("Failed to update status");
      return;
    }
    await refresh();
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this credit note case?")) return;
    const res = await fetch(`/api/credit-note-itc/${id}`, { method: "DELETE" });
    if (!res.ok) {
      toast.error("Failed to delete");
      return;
    }
    toast.success("Deleted");
    await refresh();
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-red-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Credit note ITC (purchaser)</h1>
          <p className="mt-1 text-sm text-slate-400">
            Cases you received as purchaser — decision, declaration, and 3B reversal status.
          </p>
        </div>
        <Button
          onClick={() => {
            setEditing(undefined);
            setShowForm(true);
          }}
        >
          <Plus className="h-4 w-4" />
          Add credit note
        </Button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-700/50">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-700 bg-slate-800/50">
            <tr>
              <th className="px-4 py-3 font-medium text-slate-300">CN date</th>
              <th className="px-4 py-3 font-medium text-slate-300">Supplier</th>
              <th className="px-4 py-3 font-medium text-slate-300">CN no.</th>
              <th className="px-4 py-3 font-medium text-slate-300">Decision</th>
              <th className="px-4 py-3 font-medium text-slate-300">Status</th>
              <th className="px-4 py-3 font-medium text-slate-300">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700/50">
            {records.map((record) => (
              <tr key={record.id} className="hover:bg-slate-800/30">
                <td className="px-4 py-3 text-white">{formatRecordDate(record.creditNoteDate)}</td>
                <td className="px-4 py-3 text-slate-300">{record.supplierName}</td>
                <td className="px-4 py-3 text-slate-300">{record.creditNoteNumber}</td>
                <td className="px-4 py-3 text-slate-300">{record.action.replaceAll("_", " ")}</td>
                <td className="px-4 py-3">
                  <Select
                    id={`status-${record.id}`}
                    value={record.status}
                    onChange={(e) => void handleStatus(record.id, e.target.value as CreditNoteItcStatus)}
                    options={STATUS_OPTIONS}
                  />
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      title="Edit / print"
                      onClick={() => {
                        setEditing(record);
                        setShowForm(true);
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    {canDelete ? (
                      <Button variant="ghost" size="sm" title="Delete" onClick={() => handleDelete(record.id)}>
                        <Trash2 className="h-4 w-4 text-red-400" />
                      </Button>
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {records.length === 0 ? (
          <p className="py-8 text-center text-slate-400">
            Add the first credit note you received as purchaser
          </p>
        ) : null}
      </div>

      {showForm ? (
        <Modal
          open
          size="lg"
          title={editing ? "Edit credit note" : "Add credit note"}
          onClose={() => {
            setShowForm(false);
            setEditing(undefined);
          }}
        >
          <CreditNoteItcWizard
            key={editing?.id ?? "new"}
            mode="staff"
            saving={saving}
            initial={
              editing
                ? {
                    ...editing,
                    reversalPeriod: editing.reversalPeriod ?? "",
                    reason: editing.reason as CreditNoteItcFormValue["reason"],
                    creditNoteKind: editing.creditNoteKind as CreditNoteItcFormValue["creditNoteKind"],
                    imsStatus: editing.imsStatus as CreditNoteItcFormValue["imsStatus"],
                  }
                : { purchaserName: SITE_NAME, purchaserAddress: SITE_ADDRESS }
            }
            onSave={handleSave}
          />
        </Modal>
      ) : null}
    </div>
  );
}
