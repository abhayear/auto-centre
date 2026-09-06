"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { SITE_ADDRESS, SITE_NAME, SITE_PHONE } from "@/lib/constants";
import {
  LETTER_ITEM_TYPE_ORDER,
  REPLACEMENT_ITEM_TYPE_LABELS,
  formatReplacementDate,
  formatReplacementItemType,
  type SerializedReplacementClaim,
  type SerializedReplacementStockItem,
} from "@/lib/replacement-parts";
import {
  buildWarrantyDashboard,
  claimToAllocationClaim,
  warrantySummaryComment,
} from "@/lib/warranty-allocation";

export function WarrantySummaryPrintClient({
  claims,
  stock,
  from,
  to,
}: {
  claims: SerializedReplacementClaim[];
  stock: SerializedReplacementStockItem[];
  from?: string;
  to?: string;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const printedOn = new Intl.DateTimeFormat("en-IN", { dateStyle: "long" }).format(new Date());
  const dashboard = useMemo(
    () => buildWarrantyDashboard(claims.map(claimToAllocationClaim), stock, today),
    [claims, stock, today],
  );
  const [comment, setComment] = useState(() => warrantySummaryComment(dashboard.customerHeadcount));

  const dateRangeLabel =
    from && to
      ? `${formatReplacementDate(from)} – ${formatReplacementDate(to)}`
      : from
        ? `From ${formatReplacementDate(from)}`
        : to
          ? `Up to ${formatReplacementDate(to)}`
          : "All dates";

  return (
    <div className="replacement-parts-print mx-auto max-w-3xl px-4 py-8 print:max-w-none print:px-0 print:py-0">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4 print:hidden" data-print-hide>
        <p className="text-sm text-slate-400">Add a comment if needed, then print or save as PDF.</p>
        <Button onClick={() => window.print()}>Print / Save as PDF</Button>
      </div>

      <div className="print:text-black">
        <div className="mb-6 border-b-2 border-black pb-4">
          <h1 className="text-2xl font-bold text-white print:text-black">{SITE_NAME}</h1>
          <p className="mt-1 text-sm text-slate-400 print:text-black">{SITE_ADDRESS}</p>
          <p className="text-sm text-slate-400 print:text-black">Phone: {SITE_PHONE}</p>
          <div className="mt-3 text-sm text-slate-300 print:text-black">
            <p className="font-semibold">Replacement summary report</p>
            <p>Date: {printedOn}</p>
            <p>Period: {dateRangeLabel}</p>
          </div>
        </div>

        <table className="mb-6 min-w-full text-left text-sm">
          <thead>
            <tr>
              <th className="border border-slate-600 px-3 py-2 print:border-black">Item</th>
              <th className="border border-slate-600 px-3 py-2 print:border-black">Customer pending</th>
              <th className="border border-slate-600 px-3 py-2 print:border-black">Autogalaxy</th>
              <th className="border border-slate-600 px-3 py-2 print:border-black">Plant</th>
              <th className="border border-slate-600 px-3 py-2 print:border-black">Company</th>
              <th className="border border-slate-600 px-3 py-2 print:border-black">Total</th>
            </tr>
          </thead>
          <tbody>
            {LETTER_ITEM_TYPE_ORDER.map((type) => (
              <tr key={type}>
                <td className="border border-slate-600 px-3 py-2 print:border-black">
                  {REPLACEMENT_ITEM_TYPE_LABELS[type]}
                </td>
                <td className="border border-slate-600 px-3 py-2 print:border-black">
                  {dashboard.rows[type].customerPending} / {dashboard.customersByType[type].customerPending} cust
                </td>
                <td className="border border-slate-600 px-3 py-2 print:border-black">
                  {dashboard.rows[type].autogalaxy} / {dashboard.customersByType[type].autogalaxy} cust
                </td>
                <td className="border border-slate-600 px-3 py-2 print:border-black">
                  {dashboard.rows[type].plant} / {dashboard.customersByType[type].plant} cust
                </td>
                <td className="border border-slate-600 px-3 py-2 print:border-black">
                  {dashboard.rows[type].company} / {dashboard.customersByType[type].company} cust
                </td>
                <td className="border border-slate-600 px-3 py-2 print:border-black">
                  {dashboard.rows[type].total} / {dashboard.customersByType[type].total} cust
                </td>
              </tr>
            ))}
            <tr className="font-semibold">
              <td className="border border-slate-600 px-3 py-2 print:border-black">TOTAL items</td>
              <td className="border border-slate-600 px-3 py-2 print:border-black">{dashboard.totals.customerPending}</td>
              <td className="border border-slate-600 px-3 py-2 print:border-black">{dashboard.totals.autogalaxy}</td>
              <td className="border border-slate-600 px-3 py-2 print:border-black">{dashboard.totals.plant}</td>
              <td className="border border-slate-600 px-3 py-2 print:border-black">{dashboard.totals.company}</td>
              <td className="border border-slate-600 px-3 py-2 print:border-black">{dashboard.totals.total}</td>
            </tr>
            <tr className="font-semibold">
              <td className="border border-slate-600 px-3 py-2 print:border-black">No. of customers</td>
              <td className="border border-slate-600 px-3 py-2 print:border-black">
                {dashboard.customerHeadcount.customerPending}
              </td>
              <td className="border border-slate-600 px-3 py-2 print:border-black">
                {dashboard.customerHeadcount.autogalaxy}
              </td>
              <td className="border border-slate-600 px-3 py-2 print:border-black">
                {dashboard.customerHeadcount.plant}
              </td>
              <td className="border border-slate-600 px-3 py-2 print:border-black">
                {dashboard.customerHeadcount.company}
              </td>
              <td className="border border-slate-600 px-3 py-2 print:border-black">
                {dashboard.customerHeadcount.total}
              </td>
            </tr>
          </tbody>
        </table>

        <NameSection title="Customers waiting" rows={dashboard.customerPending} />
        <NameSection title="Plant pending" rows={dashboard.plantPending} />
        <NameSection title="Company pending" rows={dashboard.companyPending} />
        <NameSection title="Allocated customers" rows={dashboard.allocatedCustomers} />

        {dashboard.availableStock.length > 0 ? (
          <div className="mb-6">
            <h2 className="mb-2 text-sm font-semibold text-white print:text-black">Available stock</h2>
            <p className="text-sm text-slate-300 print:text-black">
              {dashboard.availableStock
                .map((item) => `${item.modelCode ?? "—"} (${formatReplacementItemType(item.itemType)})`)
                .join(", ")}
            </p>
          </div>
        ) : null}

        <div className="mt-8">
          <h2 className="mb-2 text-sm font-semibold text-white print:text-black">Comments</h2>
          <textarea
            className="min-h-28 w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-white print:border-black print:bg-white print:text-black"
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            placeholder="Write any comment for this report"
          />
        </div>

        <div className="mt-10 text-sm text-slate-300 print:text-black">
          <p>For {SITE_NAME}</p>
          <p className="mt-12">Authorised Signatory</p>
        </div>
      </div>
    </div>
  );
}

function NameSection({
  title,
  rows,
}: {
  title: string;
  rows: { claimId: string; customerName: string; date: string; modelCode: string | null }[];
}) {
  if (rows.length === 0) return null;
  return (
    <div className="mb-5">
      <h2 className="mb-2 text-sm font-semibold text-white print:text-black">{title}</h2>
      <ul className="space-y-1 text-sm text-slate-300 print:text-black">
        {rows.map((row, index) => (
          <li key={`${row.claimId}-${row.modelCode ?? ""}-${index}`}>
            {formatReplacementDate(row.date)} — {row.customerName}
            {row.modelCode ? ` (${row.modelCode})` : ""}
          </li>
        ))}
      </ul>
    </div>
  );
}
