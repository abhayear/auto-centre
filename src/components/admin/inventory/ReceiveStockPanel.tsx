"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { WhatsAppContactRows } from "@/components/admin/inventory/WhatsAppContactRows";
import { isCourierServiceKind } from "@/lib/inventory-portals";

type Bill = {
  id: string;
  billNumber: string;
  status: string;
  source: string;
  portal?: { name: string };
};

type Part = { id: string; code: string; name: string };
type PortalOption = {
  id: string;
  name: string;
  websiteUrl: string;
  whatsappCatalogueNo?: string;
  serviceKind?: string;
};
type CatalogLine = { id: string; vendorSku: string; vendorName: string; inventoryPartId: string | null };

export function ReceiveStockPanel() {
  const [bills, setBills] = useState<Bill[]>([]);
  const [parts, setParts] = useState<Part[]>([]);
  const [portals, setPortals] = useState<PortalOption[]>([]);
  const [catalogLines, setCatalogLines] = useState<CatalogLine[]>([]);
  const [portalId, setPortalId] = useState("");
  const [billNumber, setBillNumber] = useState("");
  const [billDate, setBillDate] = useState("");
  const [partId, setPartId] = useState("");
  const [qty, setQty] = useState("1");
  const [newCode, setNewCode] = useState("");
  const [newName, setNewName] = useState("");

  async function load() {
    const [billRes, partRes] = await Promise.all([
      fetch("/api/inventory/bills"),
      fetch("/api/inventory/parts"),
    ]);
    if (billRes.ok) {
      const json = await billRes.json();
      setBills(json.bills ?? []);
      setPortals(json.portals ?? []);
      setCatalogLines(json.catalogLines ?? []);
    }
    if (partRes.ok) setParts(await partRes.json());
  }

  useEffect(() => {
    void load();
  }, []);

  async function confirm(id: string) {
    const res = await fetch(`/api/inventory/bills/${id}/confirm`, { method: "POST" });
    if (!res.ok) {
      toast.error("Could not confirm bill");
      return;
    }
    toast.success("Received");
    await load();
  }

  async function manualReceive() {
    const res = await fetch("/api/inventory/bills", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        portalId,
        billNumber,
        billDate,
        partId,
        qty: Number(qty),
      }),
    });
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      toast.error(json.error || "Receive failed");
      return;
    }
    toast.success("Received");
    setBillNumber("");
    await load();
  }

  async function addPart() {
    const res = await fetch("/api/inventory/parts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: newCode, name: newName }),
    });
    if (!res.ok) {
      toast.error("Could not add part");
      return;
    }
    setNewCode("");
    setNewName("");
    toast.success("Part added");
    await load();
  }

  async function linkLine(id: string, inventoryPartId: string) {
    await fetch(`/api/inventory/catalog-lines/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ inventoryPartId }),
    });
    await load();
  }

  const drafts = bills.filter((bill) => bill.status === "draft");
  const suppliers = portals.filter((portal) => !isCourierServiceKind(portal.serviceKind));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-white">Receive stock</h1>
        <p className="mt-1 text-sm text-slate-400">
          Place an order on the supplier WhatsApp, then receive qty here. Rates are not editable.
        </p>
      </div>
      {suppliers.length > 0 ? (
        <div>
          <h2 className="mb-2 text-lg text-white">Place order on WhatsApp</h2>
          <p className="mb-3 text-sm text-slate-400">
            Opens the WhatsApp app (or WhatsApp Web) to that supplier so you can send the order.
          </p>
          <WhatsAppContactRows contacts={suppliers} />
        </div>
      ) : null}
      <div>
        <h2 className="mb-2 text-lg text-white">Draft bills</h2>
        {drafts.length === 0 ? (
          <p className="text-sm text-slate-500">No synced drafts.</p>
        ) : (
          <ul className="space-y-2">
            {drafts.map((bill) => (
              <li key={bill.id} className="flex items-center justify-between rounded border border-slate-800 px-3 py-2 text-slate-200">
                <span>
                  {bill.portal?.name} {bill.billNumber}
                </span>
                <Button onClick={() => void confirm(bill.id)}>Confirm</Button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <Select
          label="Portal"
          value={portalId}
          onChange={(e) => setPortalId(e.target.value)}
          options={[
            { value: "", label: "Select portal" },
            ...suppliers.map((portal) => ({ value: portal.id, label: portal.name })),
          ]}
        />
        <Input label="Bill no" value={billNumber} onChange={(e) => setBillNumber(e.target.value)} />
        <Input label="Bill date" type="date" value={billDate} onChange={(e) => setBillDate(e.target.value)} />
        <Select
          label="Part"
          value={partId}
          onChange={(e) => setPartId(e.target.value)}
          options={[
            { value: "", label: "Select part" },
            ...parts.map((part) => ({ value: part.id, label: `${part.code} ${part.name}` })),
          ]}
        />
        <Input label="Qty" type="number" min={1} value={qty} onChange={(e) => setQty(e.target.value)} />
      </div>
      <Button onClick={() => void manualReceive()}>Receive</Button>
      <div>
        <h2 className="mb-2 text-lg text-white">Add part (code + name)</h2>
        <div className="grid gap-3 md:grid-cols-2">
          <Input label="Code" value={newCode} onChange={(e) => setNewCode(e.target.value)} />
          <Input label="Name" value={newName} onChange={(e) => setNewName(e.target.value)} />
        </div>
        <div className="mt-3">
          <Button onClick={() => void addPart()}>Add part</Button>
        </div>
      </div>
      {catalogLines.length > 0 ? (
        <div>
          <h2 className="mb-2 text-lg text-white">Link vendor SKU</h2>
          <ul className="space-y-2 text-sm text-slate-300">
            {catalogLines.map((line) => (
              <li key={line.id} className="flex items-center gap-3">
                <span>
                  {line.vendorSku} {line.vendorName}
                </span>
                <Select
                  value={line.inventoryPartId ?? ""}
                  onChange={(e) => void linkLine(line.id, e.target.value)}
                  options={[
                    { value: "", label: "Link part" },
                    ...parts.map((part) => ({ value: part.id, label: part.code })),
                  ]}
                />
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
