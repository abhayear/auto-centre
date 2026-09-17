"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useSession } from "next-auth/react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { WhatsAppContactRows } from "@/components/admin/inventory/WhatsAppContactRows";
import {
  BUYING_PORTAL_SERVICE_KIND_LABELS,
  isCourierServiceKind,
  whatsappOrderHref,
  type BuyingPortalServiceKind,
} from "@/lib/inventory-portals";
import { canManageBuyingPortals } from "@/lib/inventory-access";
import { isStaffRole } from "@/lib/admin-roles";

type Courier = {
  id: string;
  name: string;
  websiteUrl: string;
  username: string;
  passwordSaved: boolean;
  whatsappCatalogueNo?: string;
  serviceKind?: BuyingPortalServiceKind;
};

const COURIER_KINDS: BuyingPortalServiceKind[] = ["delivery", "local_courier", "transport"];

export function CourierTransportPanel() {
  const { data: session } = useSession();
  const role = session?.user?.role;
  const canEdit = role && isStaffRole(role) ? canManageBuyingPortals(role) : false;
  const [couriers, setCouriers] = useState<Courier[]>([]);
  const [name, setName] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [whatsappCatalogueNo, setWhatsappCatalogueNo] = useState("");
  const [serviceKind, setServiceKind] = useState<BuyingPortalServiceKind>("local_courier");
  const [saving, setSaving] = useState(false);

  async function load() {
    const res = await fetch("/api/inventory/portals");
    if (!res.ok) {
      toast.error("Could not load courier contacts");
      return;
    }
    const rows = (await res.json()) as Courier[];
    setCouriers(rows.filter((row) => isCourierServiceKind(row.serviceKind)));
  }

  useEffect(() => {
    void load();
  }, []);

  async function addCourier(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    const res = await fetch("/api/inventory/portals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        websiteUrl,
        username,
        password,
        whatsappCatalogueNo,
        serviceKind,
      }),
    });
    const json = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) {
      toast.error(typeof json.error === "string" ? json.error : "Could not save courier");
      return;
    }
    setName("");
    setWebsiteUrl("");
    setUsername("");
    setPassword("");
    setWhatsappCatalogueNo("");
    setServiceKind("local_courier");
    toast.success("Courier saved");
    await load();
  }

  async function saveLogin(courier: Courier, nextUsername: string, nextPassword: string, nextWhatsapp: string) {
    const res = await fetch(`/api/inventory/portals/${courier.id}`, {
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
      toast.error(typeof json.error === "string" ? json.error : "Could not save");
      return;
    }
    toast.success(`Saved ${courier.name}`);
    await load();
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-white">Courier / transport</h1>
        <p className="mt-1 text-sm text-slate-400">
          Book delivery, local courier, or transport to send a faulty battery or move goods. This is separate from buying suppliers.
        </p>
      </div>
      {canEdit ? (
        <form className="space-y-4" onSubmit={(event) => void addCourier(event)}>
          <div className="grid gap-3 md:grid-cols-2">
            <Select
              label="Type"
              value={serviceKind}
              onChange={(e) => setServiceKind(e.target.value as BuyingPortalServiceKind)}
              options={COURIER_KINDS.map((kind) => ({
                value: kind,
                label: BUYING_PORTAL_SERVICE_KIND_LABELS[kind],
              }))}
            />
            <Input
              label="Name"
              placeholder="DTDC / local tempo"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
            <Input
              label="Website (optional)"
              placeholder="courier-website.com"
              value={websiteUrl}
              onChange={(e) => setWebsiteUrl(e.target.value)}
            />
            <Input
              label="Username / mobile (optional)"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
            <Input
              label="Password (optional)"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <Input
              label="WhatsApp no."
              placeholder="9876543210"
              value={whatsappCatalogueNo}
              onChange={(e) => setWhatsappCatalogueNo(e.target.value)}
            />
          </div>
          <Button type="submit" loading={saving}>
            Save
          </Button>
        </form>
      ) : null}
      {canEdit ? (
        <div className="overflow-x-auto rounded-lg border border-slate-800">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-900 text-slate-400">
              <tr>
                <th className="px-3 py-2 text-left">Name</th>
                <th className="px-3 py-2 text-left">Type</th>
                <th className="px-3 py-2 text-left">Website</th>
                <th className="px-3 py-2 text-left">WhatsApp</th>
                <th className="px-3 py-2 text-left">Username</th>
                <th className="px-3 py-2 text-left">New password</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {couriers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-3 py-4 text-slate-500">
                    No courier or transport yet.
                  </td>
                </tr>
              ) : (
                couriers.map((courier) => (
                  <CourierRow key={courier.id} courier={courier} onSave={saveLogin} />
                ))
              )}
            </tbody>
          </table>
        </div>
      ) : couriers.length > 0 ? (
        <WhatsAppContactRows contacts={couriers} />
      ) : (
        <p className="text-sm text-slate-500">No courier or transport saved yet. Ask Admin or Manager to add one.</p>
      )}
    </div>
  );
}

function CourierRow({
  courier,
  onSave,
}: {
  courier: Courier;
  onSave: (courier: Courier, username: string, password: string, whatsapp: string) => Promise<void>;
}) {
  const [username, setUsername] = useState(courier.username);
  const [password, setPassword] = useState("");
  const [whatsapp, setWhatsapp] = useState(courier.whatsappCatalogueNo ?? "");
  const kind = courier.serviceKind ?? "local_courier";
  const orderHref = whatsappOrderHref(whatsapp, courier.name, kind);

  return (
    <tr className="border-t border-slate-800 text-slate-200">
      <td className="px-3 py-2">{courier.name}</td>
      <td className="px-3 py-2 text-slate-300">{BUYING_PORTAL_SERVICE_KIND_LABELS[kind] ?? kind}</td>
      <td className="px-3 py-2">
        {courier.websiteUrl ? (
          <a
            href={courier.websiteUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-red-400 underline hover:text-red-300"
          >
            {courier.websiteUrl}
          </a>
        ) : (
          <span className="text-slate-500">—</span>
        )}
      </td>
      <td className="space-y-2 px-3 py-2">
        <Input value={whatsapp} autoComplete="off" placeholder="9876543210" onChange={(e) => setWhatsapp(e.target.value)} />
        {orderHref ? (
          <a
            href={orderHref}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center rounded-lg bg-emerald-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-600"
          >
            Book pickup on WhatsApp
          </a>
        ) : (
          <p className="text-xs text-slate-500">Save a 10-digit WhatsApp number first.</p>
        )}
      </td>
      <td className="px-3 py-2">
        <Input value={username} autoComplete="off" onChange={(e) => setUsername(e.target.value)} />
      </td>
      <td className="px-3 py-2">
        <Input
          type="password"
          autoComplete="new-password"
          placeholder={courier.passwordSaved ? "Leave blank to keep" : "Password"}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </td>
      <td className="px-3 py-2">
        <Button type="button" size="sm" onClick={() => void onSave(courier, username, password, whatsapp)}>
          Save
        </Button>
      </td>
    </tr>
  );
}
