"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { STOCK_MOVEMENT_KIND_LABELS } from "@/lib/inventory-stock";

type Part = { id: string; code: string; name: string; onHandQty: number };

export function IssueCountPanel() {
  const [parts, setParts] = useState<Part[]>([]);
  const [kind, setKind] = useState<"issue" | "job_use" | "spare_sale" | "count">("issue");
  const [partId, setPartId] = useState("");
  const [qty, setQty] = useState("1");
  const [jobRef, setJobRef] = useState("");

  async function load() {
    const res = await fetch("/api/inventory/parts");
    if (res.ok) setParts(await res.json());
  }

  useEffect(() => {
    void load();
  }, []);

  async function submit() {
    const res = await fetch("/api/inventory/movements", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        kind,
        partId,
        qty: Number(qty),
        jobRef: jobRef || undefined,
      }),
    });
    if (!res.ok) {
      toast.error("Could not save");
      return;
    }
    toast.success("Saved");
    await load();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">Issue & count</h1>
        <p className="mt-1 text-sm text-slate-400">Issue to workshop, record job/spare use, or enter a physical count.</p>
      </div>
      <Select
        label="Kind"
        value={kind}
        onChange={(e) => setKind(e.target.value as typeof kind)}
        options={[
          { value: "issue", label: STOCK_MOVEMENT_KIND_LABELS.issue },
          { value: "job_use", label: STOCK_MOVEMENT_KIND_LABELS.job_use },
          { value: "spare_sale", label: STOCK_MOVEMENT_KIND_LABELS.spare_sale },
          { value: "count", label: STOCK_MOVEMENT_KIND_LABELS.count },
        ]}
      />
      <Select
        label="Part"
        value={partId}
        onChange={(e) => setPartId(e.target.value)}
        options={[
          { value: "", label: "Select part" },
          ...parts.map((part) => ({
            value: part.id,
            label: `${part.code} ${part.name} (qty ${part.onHandQty})`,
          })),
        ]}
      />
      <Input label="Qty" type="number" min={0} value={qty} onChange={(e) => setQty(e.target.value)} />
      <Input label="Job no (optional)" value={jobRef} onChange={(e) => setJobRef(e.target.value)} />
      <Button onClick={() => void submit()}>Save</Button>
    </div>
  );
}
