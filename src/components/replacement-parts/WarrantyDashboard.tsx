import { ClipboardList, Package, PackageCheck, Plus, Truck, Undo2, UserCheck } from "lucide-react";
import { ReplacementTrackingCharts } from "@/components/replacement-parts/ReplacementTrackingCharts";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import {
  LETTER_ITEM_TYPE_ORDER,
  REPLACEMENT_ITEM_TYPE_LABELS,
  formatReplacementDate,
  formatReplacementItemType,
} from "@/lib/replacement-parts";
import type { WarrantyDashboard as WarrantyDashboardData } from "@/lib/warranty-allocation";

const ACTIONS = [
  { id: "submit" as const, label: "Submit customer", icon: Plus },
  { id: "send" as const, label: "Send to Plant / Company", icon: Truck },
  { id: "receive" as const, label: "Receive back", icon: PackageCheck },
  { id: "allocate" as const, label: "Allocate", icon: UserCheck },
  { id: "return" as const, label: "Return", icon: Undo2 },
];

export function WarrantyDashboard({
  dashboard,
  allocateWaiting,
  returnWaiting,
  onAction,
  onReport,
}: {
  dashboard: WarrantyDashboardData;
  allocateWaiting: number;
  returnWaiting: number;
  onAction: (action: (typeof ACTIONS)[number]["id"]) => void;
  onReport: () => void;
}) {
  return (
    <div className="mb-6 space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {ACTIONS.map((action) => {
          const Icon = action.icon;
          const waiting =
            action.id === "allocate" ? allocateWaiting : action.id === "return" ? returnWaiting : 0;
          const highlight = waiting > 0;
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
                {waiting > 0 ? ` · ${waiting} waiting` : ""}
              </span>
            </Button>
          );
        })}
      </div>

      <div className="flex justify-end">
        <Button onClick={onReport}>
          <ClipboardList className="h-4 w-4" />
          Report
        </Button>
      </div>

      <ReplacementTrackingCharts dashboard={dashboard} />

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
                <CountCell
                  items={dashboard.rows[type].customerPending}
                  customers={dashboard.customersByType[type].customerPending}
                />
                <CountCell
                  items={dashboard.rows[type].autogalaxy}
                  customers={dashboard.customersByType[type].autogalaxy}
                />
                <CountCell
                  items={dashboard.rows[type].plant}
                  customers={dashboard.customersByType[type].plant}
                />
                <CountCell
                  items={dashboard.rows[type].company}
                  customers={dashboard.customersByType[type].company}
                />
                <CountCell
                  items={dashboard.rows[type].total}
                  customers={dashboard.customersByType[type].total}
                />
              </tr>
            ))}
            <tr className="font-semibold text-white">
              <td className="px-4 py-3">TOTAL items</td>
              <td className="px-4 py-3">{dashboard.totals.customerPending}</td>
              <td className="px-4 py-3">{dashboard.totals.autogalaxy}</td>
              <td className="px-4 py-3">{dashboard.totals.plant}</td>
              <td className="px-4 py-3">{dashboard.totals.company}</td>
              <td className="px-4 py-3">{dashboard.totals.total}</td>
            </tr>
            <tr className="font-semibold text-white">
              <td className="px-4 py-3">No. of customers pending</td>
              <td className="px-4 py-3">{dashboard.customerHeadcount.customerPending}</td>
              <td className="px-4 py-3">{dashboard.customerHeadcount.autogalaxy}</td>
              <td className="px-4 py-3">{dashboard.customerHeadcount.plant}</td>
              <td className="px-4 py-3">{dashboard.customerHeadcount.company}</td>
              <td className="px-4 py-3">{dashboard.customerHeadcount.total}</td>
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
            date: row.date,
            title: row.customerName,
            detail: `${row.modelCode ?? "—"} · ${row.daysPending} day${row.daysPending === 1 ? "" : "s"}`,
          }))}
        />
        <PendingList
          title="Company pending"
          empty="No items at company"
          rows={dashboard.companyPending.map((row) => ({
            key: `${row.claimId}-company`,
            date: row.date,
            title: row.customerName,
            detail: `${row.modelCode ?? "—"} · ${row.daysPending} day${row.daysPending === 1 ? "" : "s"}`,
          }))}
        />
        <PendingList
          title="Customers waiting"
          empty="No customers waiting"
          rows={dashboard.customerPending.map((row) => ({
            key: row.claimId,
            date: row.date,
            title: row.customerName,
            detail: `${row.caseNumber ?? "—"} · ${row.modelCode ?? "—"}`,
            urgent: row.urgent,
          }))}
        />
        <PendingList
          title="Allocated customers"
          empty="No customers allocated"
          rows={dashboard.allocatedCustomers.map((row) => ({
            key: row.claimId,
            date: row.date,
            title: row.customerName,
            detail: `${row.caseNumber ?? "—"} · Ready to return`,
          }))}
        />
        <PendingList
          title="Returned to customer"
          empty="No returns recorded"
          rows={dashboard.returnedCustomers.map((row) => ({
            key: row.claimId,
            date: row.date,
            title: row.customerName,
            detail: row.modelCode ?? "—",
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

function CountCell({ items, customers }: { items: number; customers: number }) {
  return (
    <td className="px-4 py-3 align-top">
      <p>{items}</p>
      <p className="text-xs font-normal text-slate-400">
        {customers} customer{customers === 1 ? "" : "s"}
      </p>
    </td>
  );
}

function groupRowsByDate<T extends { date?: string }>(rows: T[]): { date: string; rows: T[] }[] {
  const groups: { date: string; rows: T[] }[] = [];
  for (const row of rows) {
    const date = row.date || "";
    const last = groups[groups.length - 1];
    if (last && last.date === date) {
      last.rows.push(row);
    } else {
      groups.push({ date, rows: [row] });
    }
  }
  return groups;
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
  rows: { key: string; date?: string; title: string; detail: string; urgent?: boolean }[];
}) {
  const groups = groupRowsByDate(rows);
  return (
    <div className="rounded-xl border border-slate-700/50 bg-slate-800/30 p-4">
      <div className="mb-2 flex items-center gap-2">
        {icon ? <Package className="h-4 w-4 text-slate-400" /> : null}
        <h3 className="text-sm font-semibold text-white">{title}</h3>
      </div>
      {rows.length === 0 ? (
        <p className="text-sm text-slate-500">{empty}</p>
      ) : (
        <div className="space-y-3">
          {groups.map((group) => (
            <div key={group.date || title}>
              {group.date ? (
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
                  {formatReplacementDate(group.date)}
                </p>
              ) : null}
              <ul className="space-y-2 text-sm text-slate-300">
                {group.rows.map((row) => (
                  <li key={row.key} className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-medium text-white">{row.title}</span>
                    <span className="flex items-center gap-2 text-xs text-slate-400">
                      {row.urgent ? <Badge variant="danger">Urgent</Badge> : null}
                      {row.detail}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
