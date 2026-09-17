"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

type Portal = {
  id: string;
  name: string;
  websiteUrl: string;
  username: string;
  passwordSaved: boolean;
  enabled: boolean;
  connectorId: string | null;
  lastSyncedAt: string | null;
  lastError: string | null;
};

type Part = {
  id: string;
  code: string;
  name: string;
  onHandQty: number;
  purchaseRate: number;
  sellingPrice: number;
};

export function BuyingPortalsPanel() {
  const [portals, setPortals] = useState<Portal[]>([]);
  const [parts, setParts] = useState<Part[]>([]);
  const [name, setName] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [partCode, setPartCode] = useState("");
  const [partName, setPartName] = useState("");
  const [purchaseRate, setPurchaseRate] = useState("");
  const [sellingPrice, setSellingPrice] = useState("");

  async function load() {
    const [portalRes, partRes] = await Promise.all([
      fetch("/api/inventory/portals"),
      fetch("/api/inventory/parts"),
    ]);
    if (portalRes.ok) setPortals(await portalRes.json());
    if (partRes.ok) setParts(await partRes.json());
  }

  useEffect(() => {
    void load();
  }, []);

  async function addPortal() {
    const res = await fetch("/api/inventory/portals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, websiteUrl, username, password }),
    });
    if (!res.ok) {
      toast.error("Could not add portal");
      return;
    }
    setName("");
    setWebsiteUrl("");
    setUsername("");
    setPassword("");
    toast.success("Portal saved");
    await load();
  }

  async function syncPortal(id: string) {
    const res = await fetch(`/api/inventory/portals/${id}/sync`, { method: "POST" });
    const json = await res.json();
    if (!res.ok || json.ok === false) {
      toast.error(json.lastError || "Sync failed");
    } else {
      toast.success("Synced");
    }
    await load();
  }

  async function addPart() {
    const res = await fetch("/api/inventory/parts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code: partCode,
        name: partName,
        purchaseRate: Number(purchaseRate || 0),
        sellingPrice: Number(sellingPrice || 0),
      }),
    });
    if (!res.ok) {
      toast.error("Could not add part");
      return;
    }
    setPartCode("");
    setPartName("");
    setPurchaseRate("");
    setSellingPrice("");
    toast.success("Part saved");
    await load();
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-white">Buying portals</h1>
        <p className="mt-1 text-sm text-slate-400">Add supplier logins. Sync pulls bills when a connector exists.</p>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} />
        <Input label="Website URL" value={websiteUrl} onChange={(e) => setWebsiteUrl(e.target.value)} />
        <Input label="Username" value={username} onChange={(e) => setUsername(e.target.value)} />
        <Input label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
      </div>
      <Button onClick={() => void addPortal()}>Add portal</Button>
      <div className="overflow-x-auto rounded-lg border border-slate-800">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-900 text-slate-400">
            <tr>
              <th className="px-3 py-2 text-left">Name</th>
              <th className="px-3 py-2 text-left">Login</th>
              <th className="px-3 py-2 text-left">Last error</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {portals.map((portal) => (
              <tr key={portal.id} className="border-t border-slate-800 text-slate-200">
                <td className="px-3 py-2">{portal.name}</td>
                <td className="px-3 py-2">{portal.passwordSaved ? "Saved" : "Missing"}</td>
                <td className="px-3 py-2 text-amber-400">{portal.lastError ?? "—"}</td>
                <td className="px-3 py-2">
                  <Button onClick={() => void syncPortal(portal.id)}>Sync now</Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div>
        <h2 className="mb-3 text-lg font-medium text-white">Parts</h2>
        <div className="grid gap-3 md:grid-cols-4">
          <Input label="Code" value={partCode} onChange={(e) => setPartCode(e.target.value)} />
          <Input label="Name" value={partName} onChange={(e) => setPartName(e.target.value)} />
          <Input label="Purchase rate" value={purchaseRate} onChange={(e) => setPurchaseRate(e.target.value)} />
          <Input label="Selling price" value={sellingPrice} onChange={(e) => setSellingPrice(e.target.value)} />
        </div>
        <div className="mt-3">
          <Button onClick={() => void addPart()}>Add part</Button>
        </div>
        <ul className="mt-4 space-y-1 text-sm text-slate-300">
          {parts.map((part) => (
            <li key={part.id}>
              {part.code} — {part.name} (qty {part.onHandQty}, buy {part.purchaseRate}, sell {part.sellingPrice})
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
