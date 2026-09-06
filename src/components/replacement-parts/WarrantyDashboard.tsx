import { Package, PackageCheck, Plus, Truck, UserCheck } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import {
  LETTER_ITEM_TYPE_ORDER,
  REPLACEMENT_ITEM_TYPE_LABELS,
  formatReplacementItemType,
} from "@/lib/replacement-parts";
import type { WarrantyDashboard as WarrantyDashboardData } from "@/lib/warranty-allocation";

const ACTIONS = [
  { id: "submit" as const, label: "Submit customer", icon: Plus },
  { id: "send" as const, label: "Send to Plant / Company", icon: Truck },
  { id: "receive" as const, label: "Receive back", icon: PackageCheck },
  { id: "allocate" as const, label: "Allocate", icon: UserCheck },
];

export function WarrantyDashboard({
  dashboard,
  allocateWaiting,
  onAction,
}: {
  dashboard: WarrantyDashboardData;
  allocateWaiting: number;
  onAction: (action: (typeof ACTIONS)[number]["id"]) => void;
}) {
  return (
    <div className="mb-6 space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {ACTIONS.map((action) => {
          const Icon = action.icon;
          const highlight = action.id === "allocate" && allocateWaiting > 0;
          return (
            <Button
              key={action.id}
              variant={highlight ? "primary" : "outline"}
              className="h-auto justify-start py-3"
              onClick={() => onAction(action.id)}
            >
              <Icon className="h-4 w-4" />
              <span>
                {action.label}
                {action.id === "allocate" && allocateWaiting > 0 ? ` · ${allocateWaiting} waiting` : ""}
              </span>
            </Button>
          );
        })}
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-700/50">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-800/80 text-slate-300">
            <tr>
              <th className="px-4 py-3 font-medium">Item</th>
              <th className="px-4 py-3 font-medium">Customer pending</th>
              <th className="px-4 py-3 font-medium">Autogalaxy</th>
              <th className="px-4 py-3 font-medium">Plant</th>
              <th className="px-4 py-3 font-medium">Company</th>
              <th className="px-4 py-3 font-medium">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700/50 text-slate-300">
            {LETTER_ITEM_TYPE_ORDER.map((type) => (
              <tr key={type}>
                <td className="px-4 py-3 font-medium text-white">
                  {REPLACEMENT_ITEM_TYPE_LABELS[type]}
                </td>
                <td className="px-4 py-3">{dashboard.rows[type].customerPending}</td>
                <td className="px-4 py-3">{dashboard.rows[type].autogalaxy}</td>
                <td className="px-4 py-3">{dashboard.rows[type].plant}</td>
                <td className="px-4 py-3">{dashboard.rows[type].company}</td>
                <td className="px-4 py-3">{dashboard.rows[type].total}</td>
              </tr>
            ))}
            <tr className="font-semibold text-white">
              <td className="px-4 py-3">TOTAL</td>
              <td className="px-4 py-3">{dashboard.totals.customerPending}</td>
              <td className="px-4 py-3">{dashboard.totals.autogalaxy}</td>
              <td className="px-4 py-3">{dashboard.totals.plant}</td>
              <td className="px-4 py-3">{dashboard.totals.company}</td>
              <td className="px-4 py-3">{dashboard.totals.total}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <PendingList
          title="Plant pending"
          empty="No items at plant"
          rows={dashboard.plantPending.map((row) => ({
            key: `${row.claimId}-plant`,
            title: `${row.modelCode ?? "—"} — ${row.customerName}`,
            detail: `${row.daysPending} day${row.daysPending === 1 ? "" : "s"}`,
          }))}
        />
        <PendingList
          title="Company pending"
          empty="No items at company"
          rows={dashboard.companyPending.map((row) => ({
            key: `${row.claimId}-company`,
            title: `${row.modelCode ?? "—"} — ${row.customerName}`,
            detail: `${row.daysPending} day${row.daysPending === 1 ? "" : "s"}`,
          }))}
        />
        <PendingList
          title="Customer pending"
          empty="No customers waiting"
          rows={dashboard.customerPending.map((row) => ({
            key: row.claimId,
            title: `${row.caseNumber ?? "—"} — ${row.customerName} — ${row.modelCode ?? "—"}`,
            detail:
              row.remainingMonths == null
                ? "Warranty not entered"
                : `${row.remainingMonths} month${row.remainingMonths === 1 ? "" : "s"} left`,
            urgent: row.urgent,
          }))}
        />
        <PendingList
          title="Available repaired stock"
          empty="No repaired stock"
          icon
          rows={dashboard.availableStock.map((row) => ({
            key: row.id,
            title: `${row.modelCode ?? "—"} — ${formatReplacementItemType(row.itemType)}`,
            detail: "Available",
          }))}
        />
      </div>
    </div>
  );
}

function PendingList({
  title,
  empty,
  rows,
  icon,
}: {
  title: string;
  empty: string;
  icon?: boolean;
  rows: { key: string; title: string; detail: string; urgent?: boolean }[];
}) {
  return (
    <div className="rounded-xl border border-slate-700/50 bg-slate-800/30 p-4">
      <div className="mb-2 flex items-center gap-2">
        {icon ? <Package className="h-4 w-4 text-slate-400" /> : null}
        <h3 className="text-sm font-semibold text-white">{title}</h3>
      </div>
      {rows.length === 0 ? (
        <p className="text-sm text-slate-500">{empty}</p>
      ) : (
        <ul className="space-y-2 text-sm text-slate-300">
          {rows.map((row) => (
            <li key={row.key} className="flex flex-wrap items-center justify-between gap-2">
              <span>{row.title}</span>
              <span className="flex items-center gap-2 text-xs text-slate-400">
                {row.urgent ? <Badge variant="danger">Urgent</Badge> : null}
                {row.detail}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
