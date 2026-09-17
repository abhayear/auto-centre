"use client";

import { useState } from "react";
import { Input } from "@/components/ui/Input";
import {
  BUYING_PORTAL_SERVICE_KIND_LABELS,
  isCourierServiceKind,
  whatsappOrderHref,
  type BuyingPortalServiceKind,
} from "@/lib/inventory-portals";

export type WhatsAppContact = {
  id: string;
  name: string;
  websiteUrl: string;
  whatsappCatalogueNo?: string;
  serviceKind?: string;
};

export function WhatsAppContactRows({ contacts }: { contacts: WhatsAppContact[] }) {
  if (contacts.length === 0) return null;
  return (
    <ul className="space-y-2">
      {contacts.map((contact) => (
        <WhatsAppContactRow key={contact.id} contact={contact} />
      ))}
    </ul>
  );
}

function WhatsAppContactRow({ contact }: { contact: WhatsAppContact }) {
  const [whatsapp, setWhatsapp] = useState(contact.whatsappCatalogueNo ?? "");
  const kind = contact.serviceKind ?? "supplier";
  const orderHref = whatsappOrderHref(whatsapp, contact.name, kind);
  const courier = isCourierServiceKind(kind);
  const kindLabel = BUYING_PORTAL_SERVICE_KIND_LABELS[kind as BuyingPortalServiceKind] ?? "Supplier";

  return (
    <li className="flex flex-wrap items-end justify-between gap-3 rounded border border-slate-800 px-3 py-3">
      <div className="min-w-[12rem] flex-1 space-y-2">
        <p className="text-slate-200">
          {contact.name}
          {courier ? <span className="ml-2 text-sm text-slate-400">{kindLabel}</span> : null}
        </p>
        <Input
          label="WhatsApp no."
          value={whatsapp}
          placeholder="9876543210"
          onChange={(e) => setWhatsapp(e.target.value)}
        />
      </div>
      <div className="flex flex-wrap gap-2 pb-1">
        {contact.websiteUrl ? (
          <a
            href={contact.websiteUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center rounded-lg border border-slate-600 px-4 py-2 text-sm text-slate-200 hover:bg-slate-800"
          >
            Open website
          </a>
        ) : null}
        {orderHref ? (
          <a
            href={orderHref}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-600"
          >
            {courier ? "Book pickup on WhatsApp" : "Place order on WhatsApp"}
          </a>
        ) : (
          <span className="inline-flex items-center text-sm text-slate-500">Enter a 10-digit number</span>
        )}
      </div>
    </li>
  );
}
