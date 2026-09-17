"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { STOCK_MOVEMENT_KIND_LABELS, type StockMovementKind } from "@/lib/inventory-stock";

type Part = { id: string; code: string; name: string };
type Row = {
  id: string;
  kind: StockMovementKind;
  qtyDelta: number;
  qtyAfter: number;
  actorEmail: string;
  createdAt: string;
  partCode: string;
  purchaseRate: number;
  sellingPrice: number;
};

export function StockAuditPanel() {
  const [parts, setParts] = useState<Part[]>([]);
  const [rows, setRows] = useState<Row[]>([]);
  const [partId, setPartId] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  async function loadParts() {
    const res = await fetch("/api/inventory/parts");
    if (res.ok) setParts(await res.json());
  }

  async function loadAudit() {
    const params = new URLSearchParams();
    if (partId) params.set("partId", partId);
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    const res = await fetch(`/api/inventory/audit?${params.toString()}`);
    if (res.ok) setRows(await res.json());
  }

  useEffect(() => {
    void loadParts();
  }, []);

  useEffect(() => {
    void loadAudit();
  }, [partId, from, to]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">Stock audit</h1>
        <p className="mt-1 text-sm text-slate-400">Receipts, issues, job use, sales, and counts. Rates are shown, not edited.</p>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        <Select
          label="Part"
          value={partId}
          onChange={(e) => setPartId(e.target.value)}
          options={[
            { value: "", label: "All parts" },
            ...parts.map((part) => ({ value: part.id, label: `${part.code} ${part.name}` })),
          ]}
        />
        <Input label="From" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        <Input label="To" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
      </div>
      <div className="overflow-x-auto rounded-lg border border-slate-800">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-900 text-slate-400">
            <tr>
              <th className="px-3 py-2 text-left">When</th>
              <th className="px-3 py-2 text-left">Part</th>
              <th className="px-3 py-2 text-left">Kind</th>
              <th className="px-3 py-2 text-left">Delta</th>
              <th className="px-3 py-2 text-left">After</th>
              <th className="px-3 py-2 text-left">Buy / sell</th>
              <th className="px-3 py-2 text-left">Who</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-t border-slate-800 text-slate-200">
                <td className="px-3 py-2">{new Date(row.createdAt).toLocaleString()}</td>
                <td className="px-3 py-2">{row.partCode}</td>
                <td className="px-3 py-2">{STOCK_MOVEMENT_KIND_LABELS[row.kind] ?? row.kind}</td>
                <td className="px-3 py-2">{row.qtyDelta}</td>
                <td className="px-3 py-2">{row.qtyAfter}</td>
                <td className="px-3 py-2">
                  {row.purchaseRate} / {row.sellingPrice}
                </td>
                <td className="px-3 py-2">{row.actorEmail}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
