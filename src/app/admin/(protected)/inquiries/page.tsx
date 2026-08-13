"use client";

import { Inquiry, Vehicle } from "@prisma/client";
import { FileDown, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { DateRangeBulkBar } from "@/components/admin/DateRangeBulkBar";
import { Badge, statusBadgeVariant } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { formatDate, formatPrice } from "@/lib/utils";

type InquiryWithVehicle = Inquiry & { vehicle: Vehicle | null };

function buildListParams(fromDate: string, toDate: string, statusFilter: string, typeFilter: string) {
  const params = new URLSearchParams();
  if (fromDate) params.set("from", fromDate);
  if (toDate) params.set("to", toDate);
  if (statusFilter) params.set("status", statusFilter);
  if (typeFilter) params.set("type", typeFilter);
  return params;
}

export default function AdminInquiriesPage() {
  const [inquiries, setInquiries] = useState<InquiryWithVehicle[]>([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      const params = buildListParams(fromDate, toDate, statusFilter, typeFilter);
      const res = await fetch(`/api/inquiries?${params}`);
      const data = await res.json();
      if (active) {
        setInquiries(data);
        setSelectedIds([]);
        setLoading(false);
      }
    }

    load();
    return () => {
      active = false;
    };
  }, [statusFilter, typeFilter, fromDate, toDate]);

  async function refreshInquiries() {
    const params = buildListParams(fromDate, toDate, statusFilter, typeFilter);
    const res = await fetch(`/api/inquiries?${params}`);
    setInquiries(await res.json());
    setSelectedIds([]);
  }

  const allVisibleSelected = useMemo(
    () => inquiries.length > 0 && inquiries.every((item) => selectedIds.includes(item.id)),
    [inquiries, selectedIds],
  );

  function toggleSelectAllVisible() {
    if (allVisibleSelected) {
      setSelectedIds([]);
      return;
    }
    setSelectedIds(inquiries.map((item) => item.id));
  }

  function toggleSelected(id: string) {
    setSelectedIds((current) =>
      current.includes(id) ? current.filter((value) => value !== id) : [...current, id],
    );
  }

  async function updateStatus(id: string, status: string) {
    const res = await fetch("/api/inquiries", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });

    if (res.ok) {
      toast.success("Status updated");
      refreshInquiries();
    } else {
      toast.error("Failed to update status");
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this enquiry?")) return;

    const res = await fetch(`/api/inquiries/${id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Enquiry deleted");
      refreshInquiries();
    } else {
      toast.error("Failed to delete enquiry");
    }
  }

  async function handleBulkDelete() {
    if (selectedIds.length === 0) return;
    if (!confirm(`Delete ${selectedIds.length} selected enquiry(ies)?`)) return;

    setBulkDeleting(true);
    try {
      const res = await fetch(`/api/inquiries?ids=${selectedIds.join(",")}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(`Deleted ${data.deleted ?? selectedIds.length} enquiry(ies)`);
        refreshInquiries();
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
    const params = buildListParams(fromDate, toDate, statusFilter, typeFilter);
    params.set("auto", "1");
    window.open(`/admin/inquiries/print?${params}`, "_blank");
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
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Inquiries</h1>
          <p className="mt-1 text-sm text-slate-400">
            Filter by date or type, select entries, and delete in bulk.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" onClick={handleExportPdf}>
            <FileDown className="h-4 w-4" />
            Export PDF
          </Button>
          <div className="w-40">
            <Select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              options={[
                { value: "test_drive", label: "Online Booking" },
                { value: "contact", label: "Contact" },
                { value: "general", label: "General" },
              ]}
              placeholder="All Types"
            />
          </div>
          <div className="w-40">
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              options={[
                { value: "new", label: "New" },
                { value: "replied", label: "Replied" },
                { value: "closed", label: "Closed" },
              ]}
              placeholder="All Statuses"
            />
          </div>
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
        visibleCount={inquiries.length}
        onSelectAllVisible={() => setSelectedIds(inquiries.map((item) => item.id))}
        onClearSelection={() => setSelectedIds([])}
        onBulkDelete={() => void handleBulkDelete()}
        bulkDeleting={bulkDeleting}
      />

      <div className="space-y-4">
        {inquiries.length > 0 && (
          <label className="flex items-center gap-2 text-sm text-slate-400">
            <input
              type="checkbox"
              checked={allVisibleSelected}
              onChange={toggleSelectAllVisible}
              className="rounded border-slate-600 bg-slate-900 text-red-600 focus:ring-red-500"
            />
            Select all shown ({inquiries.length})
          </label>
        )}

        {inquiries.map((inquiry) => (
          <div
            key={inquiry.id}
            className="rounded-xl border border-slate-700/50 bg-slate-800/30 p-4"
          >
            <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={selectedIds.includes(inquiry.id)}
                  onChange={() => toggleSelected(inquiry.id)}
                  aria-label={`Select ${inquiry.name}`}
                  className="mt-1 rounded border-slate-600 bg-slate-900 text-red-600 focus:ring-red-500"
                />
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-white">{inquiry.name}</p>
                    <Badge variant="default">{inquiry.type.replace("_", " ")}</Badge>
                    <Badge variant={statusBadgeVariant(inquiry.status)}>
                      {inquiry.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-slate-400">
                    {inquiry.email}
                    {inquiry.phone && ` · ${inquiry.phone}`}
                  </p>
                  {inquiry.vehicle && (
                    <p className="text-sm text-red-400">
                      Re: {inquiry.vehicle.year} {inquiry.vehicle.make}{" "}
                      {inquiry.vehicle.model}
                    </p>
                  )}
                  {inquiry.bookingAmountAtBooking != null &&
                    inquiry.bookingAmountAtBooking > 0 && (
                      <p className="text-sm text-amber-300">
                        Booking payment: {formatPrice(inquiry.bookingAmountAtBooking)}
                        {inquiry.paymentStatus === "paid" ? " · Paid" : ` · ${inquiry.paymentStatus}`}
                      </p>
                    )}
                  {inquiry.paymentId && (
                    <p className="text-xs text-slate-500">Payment ID: {inquiry.paymentId}</p>
                  )}
                  {inquiry.refundAmountAtBooking != null &&
                    inquiry.refundAmountAtBooking > 0 && (
                      <p className="text-sm text-green-400">
                        Online booking refund: {formatPrice(inquiry.refundAmountAtBooking)}
                      </p>
                    )}
                </div>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-36">
                  <Select
                    value={inquiry.status}
                    onChange={(e) => updateStatus(inquiry.id, e.target.value)}
                    options={[
                      { value: "new", label: "New" },
                      { value: "replied", label: "Replied" },
                      { value: "closed", label: "Closed" },
                    ]}
                  />
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-red-400 hover:text-red-300"
                  onClick={() => void handleDelete(inquiry.id)}
                  aria-label="Delete enquiry"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <p className="ml-7 text-sm text-slate-300">{inquiry.message}</p>
            <p className="ml-7 mt-2 text-xs text-slate-500">{formatDate(inquiry.createdAt)}</p>
          </div>
        ))}
        {inquiries.length === 0 && (
          <p className="py-8 text-center text-slate-400">No inquiries found for this filter.</p>
        )}
      </div>
    </div>
  );
}
