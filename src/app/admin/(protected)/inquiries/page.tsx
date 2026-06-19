"use client";

import { Inquiry, Vehicle } from "@prisma/client";
import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Badge, statusBadgeVariant } from "@/components/ui/Badge";
import { Select } from "@/components/ui/Select";
import { formatDate } from "@/lib/utils";

type InquiryWithVehicle = Inquiry & { vehicle: Vehicle | null };

export default function AdminInquiriesPage() {
  const [inquiries, setInquiries] = useState<InquiryWithVehicle[]>([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchInquiries = useCallback(async () => {
    const params = new URLSearchParams();
    if (statusFilter) params.set("status", statusFilter);
    if (typeFilter) params.set("type", typeFilter);
    const res = await fetch(`/api/inquiries?${params}`);
    const data = await res.json();
    setInquiries(data);
    setLoading(false);
  }, [statusFilter, typeFilter]);

  useEffect(() => {
    fetchInquiries();
  }, [fetchInquiries]);

  async function updateStatus(id: string, status: string) {
    const res = await fetch("/api/inquiries", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });

    if (res.ok) {
      toast.success("Status updated");
      fetchInquiries();
    } else {
      toast.error("Failed to update status");
    }
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
        <h1 className="text-2xl font-bold text-white">Inquiries</h1>
        <div className="flex gap-3">
          <div className="w-40">
            <Select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              options={[
                { value: "test_drive", label: "Test Drive" },
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

      <div className="space-y-4">
        {inquiries.map((inquiry) => (
          <div
            key={inquiry.id}
            className="rounded-xl border border-slate-700/50 bg-slate-800/30 p-4"
          >
            <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
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
              </div>
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
            </div>
            <p className="text-sm text-slate-300">{inquiry.message}</p>
            <p className="mt-2 text-xs text-slate-500">
              {formatDate(inquiry.createdAt)}
            </p>
          </div>
        ))}
        {inquiries.length === 0 && (
          <p className="py-8 text-center text-slate-400">No inquiries found.</p>
        )}
      </div>
    </div>
  );
}
