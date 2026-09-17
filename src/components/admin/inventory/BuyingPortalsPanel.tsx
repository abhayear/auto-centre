"use client";

import { useEffect, useState, type FormEvent } from "react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { whatsappOrderHref } from "@/lib/inventory-portals";

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
  whatsappCatalogueNo?: string;
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
  const [whatsappCatalogueNo, setWhatsappCatalogueNo] = useState("");
  const [saving, setSaving] = useState(false);
  const [partCode, setPartCode] = useState("");
  const [partName, setPartName] = useState("");
  const [purchaseRate, setPurchaseRate] = useState("");
  const [sellingPrice, setSellingPrice] = useState("");

  async function load() {
    const [portalRes, partRes] = await Promise.all([
      fetch("/api/inventory/portals"),
      fetch("/api/inventory/parts"),
    ]);
    if (!portalRes.ok) {
      toast.error(
        portalRes.status === 403
          ? "Sign in as Admin or Manager to save portal logins"
          : "Could not load portals",
      );
      return;
    }
    setPortals(await portalRes.json());
    if (partRes.ok) setParts(await partRes.json());
  }

  useEffect(() => {
    void load();
  }, []);

  async function addPortal(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    const res = await fetch("/api/inventory/portals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, websiteUrl, username, password, whatsappCatalogueNo }),
    });
    const json = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) {
      toast.error(typeof json.error === "string" ? json.error : "Could not save portal login");
      return;
    }
    setName("");
    setWebsiteUrl("");
    setUsername("");
    setPassword("");
    setWhatsappCatalogueNo("");
    toast.success("Portal login saved");
    await load();
  }

  async function saveLogin(
    portal: Portal,
    nextUsername: string,
    nextPassword: string,
    nextWhatsapp: string,
  ) {
    const res = await fetch(`/api/inventory/portals/${portal.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: nextUsername,
        whatsappCatalogueNo: nextWhatsapp,
        ...(nextPassword ? { password: nextPassword } : {}),
      }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error(typeof json.error === "string" ? json.error : "Could not save login");
      return;
    }
    toast.success(`Login saved for ${portal.name}`);
    await load();
  }

  async function syncPortal(id: string) {
    const res = await fetch(`/api/inventory/portals/${id}/sync`, { method: "POST" });
    const json = await res.json();
    if (!res.ok || json.ok === false) {
      toast.error(json.lastError || json.error || "Sync failed");
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
        <p className="mt-1 text-sm text-slate-400">
          Sign in as Admin or Manager. Name is enough. Buy link, username, and password are optional. Purchasing uses Place order on WhatsApp to chat and order.
        </p>
      </div>
      <form className="space-y-4" onSubmit={(event) => void addPortal(event)}>
        <div className="grid gap-3 md:grid-cols-2">
          <Input
            label="Portal name"
            name="portalName"
            autoComplete="off"
            placeholder="Elyf EV Spare"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <Input
            label="Website (optional)"
            name="portalWebsite"
            autoComplete="off"
            placeholder="supplier-website.com"
            value={websiteUrl}
            onChange={(e) => setWebsiteUrl(e.target.value)}
          />
          <Input
            label="Portal username / mobile (optional)"
            name="portalUsername"
            autoComplete="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <Input
            label="Portal password (optional)"
            name="portalPassword"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <Input
            label="Supplier WhatsApp no."
            name="whatsappCatalogueNo"
            autoComplete="off"
            placeholder="9876543210"
            value={whatsappCatalogueNo}
            onChange={(e) => setWhatsappCatalogueNo(e.target.value)}
          />
        </div>
        <Button type="submit" loading={saving}>
          Save portal login
        </Button>
      </form>
      <div className="overflow-x-auto rounded-lg border border-slate-800">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-900 text-slate-400">
            <tr>
              <th className="px-3 py-2 text-left">Name</th>
              <th className="px-3 py-2 text-left">Buy link</th>
              <th className="px-3 py-2 text-left">WhatsApp order</th>
              <th className="px-3 py-2 text-left">Username</th>
              <th className="px-3 py-2 text-left">New password</th>
              <th className="px-3 py-2 text-left">Login</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {portals.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-3 py-4 text-slate-500">
                  No portals yet. Fill the form above and click Save portal login.
                </td>
              </tr>
            ) : (
              portals.map((portal) => (
                <PortalLoginRow
                  key={portal.id}
                  portal={portal}
                  onSave={saveLogin}
                  onSync={syncPortal}
                />
              ))
            )}
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

function PortalLoginRow({
  portal,
  onSave,
  onSync,
}: {
  portal: Portal;
  onSave: (portal: Portal, username: string, password: string, whatsapp: string) => Promise<void>;
  onSync: (id: string) => Promise<void>;
}) {
  const [username, setUsername] = useState(portal.username);
  const [password, setPassword] = useState("");
  const [whatsapp, setWhatsapp] = useState(portal.whatsappCatalogueNo ?? "");
  const orderHref = whatsappOrderHref(whatsapp, portal.name);

  return (
    <tr className="border-t border-slate-800 text-slate-200">
      <td className="px-3 py-2">{portal.name}</td>
      <td className="px-3 py-2">
        {portal.websiteUrl ? (
          <a
            href={portal.websiteUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-red-400 underline hover:text-red-300"
          >
            {portal.websiteUrl}
          </a>
        ) : (
          <span className="text-slate-500">—</span>
        )}
      </td>
      <td className="space-y-2 px-3 py-2">
        <Input
          value={whatsapp}
          autoComplete="off"
          placeholder="9876543210"
          onChange={(e) => setWhatsapp(e.target.value)}
        />
        {orderHref ? (
          <a
            href={orderHref}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center rounded-lg bg-emerald-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-600"
          >
            Place order on WhatsApp
          </a>
        ) : (
          <p className="text-xs text-slate-500">Save a 10-digit WhatsApp number first.</p>
        )}
      </td>
      <td className="px-3 py-2">
        <Input
          value={username}
          autoComplete="off"
          onChange={(e) => setUsername(e.target.value)}
        />
      </td>
      <td className="px-3 py-2">
        <Input
          type="password"
          autoComplete="new-password"
          placeholder={portal.passwordSaved ? "Leave blank to keep" : "Password"}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </td>
      <td className="px-3 py-2">{portal.passwordSaved ? "Saved" : "Missing"}</td>
      <td className="space-y-2 px-3 py-2">
        <Button
          type="button"
          size="sm"
          onClick={() => void onSave(portal, username, password, whatsapp)}
        >
          Save login
        </Button>
        <Button type="button" size="sm" variant="secondary" onClick={() => void onSync(portal.id)}>
          Sync now
        </Button>
      </td>
    </tr>
  );
}
