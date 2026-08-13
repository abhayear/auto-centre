"use client";

import { useEffect, useMemo, useState } from "react";
import { FileDown, Pencil, Plus, Store, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { DateRangeBulkBar } from "@/components/admin/DateRangeBulkBar";
import {
  ShowroomWalkInForm,
  type ShowroomWalkInView,
} from "@/components/forms/ShowroomWalkInForm";
import { Button } from "@/components/ui/Button";
import {
  formatShowroomDate,
  formatShowroomPaymentMode,
} from "@/lib/showroom-walk-ins";

function buildListParams(fromDate: string, toDate: string) {
  const params = new URLSearchParams();
  if (fromDate) params.set("from", fromDate);
  if (toDate) params.set("to", toDate);
  return params;
}

export default function AdminShowroomWalkInsPage() {
  const [enquiries, setEnquiries] = useState<ShowroomWalkInView[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingEnquiry, setEditingEnquiry] = useState<ShowroomWalkInView | undefined>();
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      const params = buildListParams(fromDate, toDate);
      const res = await fetch(`/api/showroom-walk-ins?${params}`);
      const data = await res.json();
      if (active) {
        setEnquiries(Array.isArray(data) ? data : []);
        setSelectedIds([]);
        setLoading(false);
      }
    }

    load();
    return () => {
      active = false;
    };
  }, [fromDate, toDate]);

  async function refreshEnquiries() {
    const params = buildListParams(fromDate, toDate);
    const res = await fetch(`/api/showroom-walk-ins?${params}`);
    setEnquiries(await res.json());
    setSelectedIds([]);
  }

  const allVisibleSelected = useMemo(
    () => enquiries.length > 0 && enquiries.every((item) => selectedIds.includes(item.id)),
    [enquiries, selectedIds],
  );

  function toggleSelectAllVisible() {
    if (allVisibleSelected) {
      setSelectedIds([]);
      return;
    }
    setSelectedIds(enquiries.map((item) => item.id));
  }

  function toggleSelected(id: string) {
    setSelectedIds((current) =>
      current.includes(id) ? current.filter((value) => value !== id) : [...current, id],
    );
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this walk-in enquiry?")) return;

    const res = await fetch(`/api/showroom-walk-ins?id=${id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Enquiry deleted");
      refreshEnquiries();
    } else {
      toast.error("Failed to delete enquiry");
    }
  }

  async function handleBulkDelete() {
    if (selectedIds.length === 0) return;
    if (!confirm(`Delete ${selectedIds.length} selected walk-in enquiry(ies)?`)) return;

    setBulkDeleting(true);
    try {
      const res = await fetch(`/api/showroom-walk-ins?ids=${selectedIds.join(",")}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(`Deleted ${data.deleted ?? selectedIds.length} enquiry(ies)`);
        refreshEnquiries();
      } else {
        toast.error(data.error ?? "Failed to delete enquiries");
      }
    } catch {
      toast.error("Failed to delete enquiries");
    } finally {
      setBulkDeleting(false);
    }
  }

  function handleExportPdf() {
    const params = buildListParams(fromDate, toDate);
    params.set("auto", "1");
    window.open(`/admin/showroom-walk-ins/print?${params}`, "_blank");
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
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Showroom walk-in enquiries</h1>
          <p className="mt-1 text-sm text-slate-400">
            Filter by date, select entries, and delete in bulk.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" onClick={handleExportPdf}>
            <FileDown className="h-4 w-4" />
            Export PDF
          </Button>
          <Button
            onClick={() => {
              setEditingEnquiry(undefined);
              setShowForm(true);
            }}
          >
            <Plus className="h-4 w-4" />
            Add enquiry
          </Button>
        </div>
      </div>

      <DateRangeBulkBar
        fromDate={fromDate}
        toDate={toDate}
        onFromDateChange={setFromDate}
        onToDateChange={setToDate}
        onClearDates={() => {
          setFromDate("");
          setToDate("");
        }}
        selectedCount={selectedIds.length}
        visibleCount={enquiries.length}
        onSelectAllVisible={() => setSelectedIds(enquiries.map((item) => item.id))}
        onClearSelection={() => setSelectedIds([])}
        onBulkDelete={() => void handleBulkDelete()}
        bulkDeleting={bulkDeleting}
      />

      {enquiries.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-700/50 bg-slate-800/20 p-10 text-center">
          <Store className="mx-auto mb-3 h-8 w-8 text-slate-500" />
          <p className="text-slate-400">No walk-in enquiries found for this date range.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-700/50">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-800/80 text-slate-300">
              <tr>
                <th className="px-4 py-3 font-medium">
                  <input
                    type="checkbox"
                    checked={allVisibleSelected}
                    onChange={toggleSelectAllVisible}
                    aria-label="Select all shown walk-in enquiries"
                    className="rounded border-slate-600 bg-slate-900 text-red-600 focus:ring-red-500"
                  />
                </th>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Required model</th>
                <th className="px-4 py-3 font-medium">Contact</th>
                <th className="px-4 py-3 font-medium">Address</th>
                <th className="px-4 py-3 font-medium">Payment</th>
                <th className="px-4 py-3 font-medium">Expected purchase</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {enquiries.map((enquiry) => (
                <tr key={enquiry.id} className="text-slate-300">
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(enquiry.id)}
                      onChange={() => toggleSelected(enquiry.id)}
                      aria-label={`Select ${enquiry.name}`}
                      className="rounded border-slate-600 bg-slate-900 text-red-600 focus:ring-red-500"
                    />
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {formatShowroomDate(enquiry.enquiryDate)}
                  </td>
                  <td className="px-4 py-3 font-medium text-white">{enquiry.name}</td>
                  <td className="px-4 py-3">{enquiry.requiredModel}</td>
                  <td className="px-4 py-3">{enquiry.contactNumber ?? "—"}</td>
                  <td className="px-4 py-3 max-w-xs truncate">{enquiry.address ?? "—"}</td>
                  <td className="px-4 py-3">{formatShowroomPaymentMode(enquiry.paymentMode)}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {formatShowroomDate(enquiry.expectedPurchaseDate)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditingEnquiry(enquiry);
                          setShowForm(true);
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-400 hover:text-red-300"
                        onClick={() => void handleDelete(enquiry.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <ShowroomWalkInForm
          enquiry={editingEnquiry}
          onSuccess={() => {
            setShowForm(false);
            setEditingEnquiry(undefined);
            refreshEnquiries();
          }}
          onCancel={() => {
            setShowForm(false);
            setEditingEnquiry(undefined);
          }}
        />
      )}
    </div>
  );
}
