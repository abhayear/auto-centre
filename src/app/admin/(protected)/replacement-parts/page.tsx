"use client";

import { useEffect, useMemo, useState } from "react";
import { FileDown, FileText, Package, Pencil, Plus, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { DateRangeBulkBar } from "@/components/admin/DateRangeBulkBar";
import {
  ReplacementClaimForm,
  type ReplacementClaimView,
} from "@/components/forms/ReplacementClaimForm";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import {
  REPLACEMENT_ITEM_TYPE_OPTIONS,
  REPLACEMENT_STATUS_OPTIONS,
  formatItemSpecs,
  formatReplacementDate,
  formatReplacementItemType,
  formatReplacementStatus,
  replacementStatusVariant,
} from "@/lib/replacement-parts";

function buildListParams(
  fromDate: string,
  toDate: string,
  statusFilter: string,
  itemTypeFilter: string,
) {
  const params = new URLSearchParams();
  if (fromDate) params.set("from", fromDate);
  if (toDate) params.set("to", toDate);
  if (statusFilter) params.set("status", statusFilter);
  if (itemTypeFilter) params.set("itemType", itemTypeFilter);
  return params;
}

function summarizeOldItems(claim: ReplacementClaimView): string {
  const oldItems = claim.items.filter((item) => item.side === "old");
  if (oldItems.length === 0) return "—";
  return oldItems
    .map(
      (item) =>
        `${formatReplacementItemType(item.itemType)}${item.modelCode ? ` (${item.modelCode})` : ""}`,
    )
    .join(", ");
}

export default function AdminReplacementPartsPage() {
  const [claims, setClaims] = useState<ReplacementClaimView[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingClaim, setEditingClaim] = useState<ReplacementClaimView | undefined>();
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [itemTypeFilter, setItemTypeFilter] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [statusUpdatingId, setStatusUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      const params = buildListParams(fromDate, toDate, statusFilter, itemTypeFilter);
      const res = await fetch(`/api/replacement-parts?${params}`);
      const data = await res.json();
      if (active) {
        setClaims(Array.isArray(data) ? data : []);
        setSelectedIds([]);
        setLoading(false);
      }
    }

    load();
    return () => {
      active = false;
    };
  }, [fromDate, toDate, statusFilter, itemTypeFilter]);

  async function refreshClaims() {
    const params = buildListParams(fromDate, toDate, statusFilter, itemTypeFilter);
    const res = await fetch(`/api/replacement-parts?${params}`);
    setClaims(await res.json());
    setSelectedIds([]);
  }

  const allVisibleSelected = useMemo(
    () => claims.length > 0 && claims.every((item) => selectedIds.includes(item.id)),
    [claims, selectedIds],
  );

  function toggleSelectAllVisible() {
    if (allVisibleSelected) {
      setSelectedIds([]);
      return;
    }
    setSelectedIds(claims.map((item) => item.id));
  }

  function toggleSelected(id: string) {
    setSelectedIds((current) =>
      current.includes(id) ? current.filter((value) => value !== id) : [...current, id],
    );
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this replacement claim?")) return;

    const res = await fetch(`/api/replacement-parts?id=${id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Claim deleted");
      refreshClaims();
    } else {
      toast.error("Failed to delete claim");
    }
  }

  async function handleBulkDelete() {
    if (selectedIds.length === 0) return;
    if (!confirm(`Delete ${selectedIds.length} selected claim(s)?`)) return;

    setBulkDeleting(true);
    try {
      const res = await fetch(`/api/replacement-parts?ids=${selectedIds.join(",")}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(`Deleted ${data.deleted ?? selectedIds.length} claim(s)`);
        refreshClaims();
      } else {
        toast.error(data.error ?? "Failed to delete claims");
      }
    } catch {
      toast.error("Failed to delete claims");
    } finally {
      setBulkDeleting(false);
    }
  }

  async function handleStatusChange(id: string, status: string) {
    setStatusUpdatingId(id);
    try {
      const res = await fetch("/api/replacement-parts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success("Status updated");
        setClaims((current) => current.map((claim) => (claim.id === id ? data : claim)));
      } else {
        toast.error(data.error ?? "Failed to update status");
      }
    } catch {
      toast.error("Failed to update status");
    } finally {
      setStatusUpdatingId(null);
    }
  }

  function openLetterPrint(ids?: string[]) {
    const params = buildListParams(fromDate, toDate, "", itemTypeFilter);
    if (ids && ids.length > 0) {
      params.set("ids", ids.join(","));
    } else {
      params.set("letter", "1");
    }
    params.set("auto", "1");
    window.open(`/admin/replacement-parts/print?${params}`, "_blank");
  }

  function handleExportPdf() {
    openLetterPrint(selectedIds.length > 0 ? selectedIds : undefined);
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
          <h1 className="text-2xl font-bold text-white">Replacement Parts Tracker</h1>
          <p className="mt-1 text-sm text-slate-400">
            Track faulty battery, charger, controller, and motor replacements from customers to
            Yakuza.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" onClick={() => openLetterPrint()}>
            <FileText className="h-4 w-4" />
            Generate letter
          </Button>
          <Button variant="outline" onClick={handleExportPdf}>
            <FileDown className="h-4 w-4" />
            Export PDF
          </Button>
          <Button
            onClick={() => {
              setEditingClaim(undefined);
              setShowForm(true);
            }}
          >
            <Plus className="h-4 w-4" />
            Add claim
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
        visibleCount={claims.length}
        onSelectAllVisible={() => setSelectedIds(claims.map((item) => item.id))}
        onClearSelection={() => setSelectedIds([])}
        onBulkDelete={() => void handleBulkDelete()}
        bulkDeleting={bulkDeleting}
      />

      <div className="mb-6 flex flex-wrap items-end gap-4 rounded-xl border border-slate-700/50 bg-slate-800/30 p-4">
        <div className="w-52">
          <Select
            id="status-filter"
            label="Status"
            placeholder="All statuses"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            options={REPLACEMENT_STATUS_OPTIONS}
          />
        </div>
        <div className="w-52">
          <Select
            id="item-type-filter"
            label="Item type"
            placeholder="All item types"
            value={itemTypeFilter}
            onChange={(e) => setItemTypeFilter(e.target.value)}
            options={REPLACEMENT_ITEM_TYPE_OPTIONS}
          />
        </div>
        {(statusFilter || itemTypeFilter) && (
          <Button
            variant="ghost"
            onClick={() => {
              setStatusFilter("");
              setItemTypeFilter("");
            }}
          >
            Clear filters
          </Button>
        )}
      </div>

      {claims.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-700/50 bg-slate-800/20 p-10 text-center">
          <Package className="mx-auto mb-3 h-8 w-8 text-slate-500" />
          <p className="text-slate-400">No replacement claims found for these filters.</p>
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
                    aria-label="Select all shown claims"
                    className="rounded border-slate-600 bg-slate-900 text-red-600 focus:ring-red-500"
                  />
                </th>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Customer</th>
                <th className="px-4 py-3 font-medium">Phone</th>
                <th className="px-4 py-3 font-medium">Bill No</th>
                <th className="px-4 py-3 font-medium">Faulty items</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {claims.map((claim) => {
                const oldItems = claim.items.filter((item) => item.side === "old");
                return (
                  <tr key={claim.id} className="text-slate-300">
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(claim.id)}
                        onChange={() => toggleSelected(claim.id)}
                        aria-label={`Select ${claim.customerName}`}
                        className="rounded border-slate-600 bg-slate-900 text-red-600 focus:ring-red-500"
                      />
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {formatReplacementDate(claim.receivedDate)}
                    </td>
                    <td className="px-4 py-3 font-medium text-white">{claim.customerName}</td>
                    <td className="px-4 py-3">{claim.customerPhone ?? "—"}</td>
                    <td className="px-4 py-3">{claim.billNumber ?? "—"}</td>
                    <td className="px-4 py-3 max-w-xs">
                      <p className="truncate">{summarizeOldItems(claim)}</p>
                      {oldItems.length > 0 && (
                        <p className="mt-1 text-xs text-slate-500">
                          {oldItems
                            .map((item) => formatItemSpecs(item))
                            .filter((spec) => spec !== "—")
                            .join(" · ")}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="space-y-2">
                        <Badge variant={replacementStatusVariant(claim.status)}>
                          {formatReplacementStatus(claim.status)}
                        </Badge>
                        <Select
                          id={`status-${claim.id}`}
                          value={claim.status}
                          disabled={statusUpdatingId === claim.id}
                          onChange={(e) => void handleStatusChange(claim.id, e.target.value)}
                          options={REPLACEMENT_STATUS_OPTIONS}
                        />
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          title="Generate letter for this claim"
                          onClick={() => openLetterPrint([claim.id])}
                        >
                          <FileText className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditingClaim(claim);
                            setShowForm(true);
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-400 hover:text-red-300"
                          onClick={() => void handleDelete(claim.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <ReplacementClaimForm
          claim={editingClaim}
          onSuccess={() => {
            setShowForm(false);
            setEditingClaim(undefined);
            refreshClaims();
          }}
          onCancel={() => {
            setShowForm(false);
            setEditingClaim(undefined);
          }}
        />
      )}
    </div>
  );
}
