"use client";

import { useEffect, useMemo } from "react";
import { ReplacementTrackingCharts } from "@/components/replacement-parts/ReplacementTrackingCharts";
import { Button } from "@/components/ui/Button";
import { SITE_ADDRESS, SITE_NAME, SITE_PHONE } from "@/lib/constants";
import {
  LETTER_ITEM_TYPE_ORDER,
  MOVEMENT_REPORT_STAGES,
  MOVEMENT_STAGE_LABELS,
  REPLACEMENT_ITEM_TYPE_LABELS,
  TRACK_DATE_FIELD_LABELS,
  buildMovementReport,
  formatReplacementDate,
  formatReplacementItemType,
  formatReplacementStatus,
  movementReportKindForDateField,
  type SerializedReplacementClaim,
  type SerializedReplacementStockItem,
  type TrackDateField,
} from "@/lib/replacement-parts";
import {
  buildWarrantyDashboard,
  claimToAllocationClaim,
} from "@/lib/warranty-allocation";

export function TrackingPeriodPrintClient({
  claims,
  stock,
  from,
  to,
  dateField,
  autoPrint = false,
}: {
  claims: SerializedReplacementClaim[];
  stock: SerializedReplacementStockItem[];
  from?: string;
  to?: string;
  dateField: TrackDateField;
  autoPrint?: boolean;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const printedOn = new Intl.DateTimeFormat("en-IN", { dateStyle: "long" }).format(new Date());
  const dashboard = useMemo(
    () => buildWarrantyDashboard(claims.map(claimToAllocationClaim), stock, today),
    [claims, stock, today],
  );
  const kind = movementReportKindForDateField(dateField);
  const report = buildMovementReport(claims, kind);
  const visibleStages = MOVEMENT_REPORT_STAGES[kind];

  const dateRangeLabel =
    from && to
      ? `${formatReplacementDate(from)} – ${formatReplacementDate(to)}`
      : from
        ? `From ${formatReplacementDate(from)}`
        : to
          ? `Up to ${formatReplacementDate(to)}`
          : "All dates";

  useEffect(() => {
    if (!autoPrint) return;
    const timer = window.setTimeout(() => window.print(), 400);
    return () => window.clearTimeout(timer);
  }, [autoPrint]);

  return (
    <div className="replacement-parts-print mx-auto max-w-6xl px-4 py-8 print:max-w-none print:px-0 print:py-0">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4 print:hidden" data-print-hide>
        <p className="text-sm text-slate-400">
          Use your browser&apos;s print dialog and choose &quot;Save as PDF&quot; to export.
        </p>
        <Button onClick={() => window.print()}>Print / Save as PDF</Button>
      </div>

      <div className="print:text-black">
        <div className="mb-6 border-b-2 border-black pb-4">
          <h1 className="text-2xl font-bold text-white print:text-black">{SITE_NAME}</h1>
          <p className="mt-1 text-sm text-slate-400 print:text-black">{SITE_ADDRESS}</p>
          <p className="text-sm text-slate-400 print:text-black">Phone: {SITE_PHONE}</p>
          <div className="mt-3 text-sm text-slate-300 print:text-black">
            <p className="font-semibold">Replacement tracking report</p>
            <p>Track: {TRACK_DATE_FIELD_LABELS[dateField]}</p>
            <p>Period: {dateRangeLabel}</p>
            <p>Printed: {printedOn}</p>
          </div>
        </div>

        <div className="mb-6 print:hidden">
          <ReplacementTrackingCharts dashboard={dashboard} />
        </div>

        <h2 className="mb-2 text-sm font-semibold text-white print:text-black">
          Items by type at each location
        </h2>
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
                  {dashboard.rows[type].customerPending}
                </td>
                <td className="border border-slate-600 px-3 py-2 print:border-black">
                  {dashboard.rows[type].autogalaxy}
                </td>
                <td className="border border-slate-600 px-3 py-2 print:border-black">
                  {dashboard.rows[type].plant}
                </td>
                <td className="border border-slate-600 px-3 py-2 print:border-black">
                  {dashboard.rows[type].company}
                </td>
                <td className="border border-slate-600 px-3 py-2 print:border-black">
                  {dashboard.rows[type].total}
                </td>
              </tr>
            ))}
            <tr className="font-semibold">
              <td className="border border-slate-600 px-3 py-2 print:border-black">TOTAL items</td>
              <td className="border border-slate-600 px-3 py-2 print:border-black">
                {dashboard.totals.customerPending}
              </td>
              <td className="border border-slate-600 px-3 py-2 print:border-black">
                {dashboard.totals.autogalaxy}
              </td>
              <td className="border border-slate-600 px-3 py-2 print:border-black">{dashboard.totals.plant}</td>
              <td className="border border-slate-600 px-3 py-2 print:border-black">{dashboard.totals.company}</td>
              <td className="border border-slate-600 px-3 py-2 print:border-black">{dashboard.totals.total}</td>
            </tr>
          </tbody>
        </table>

        <h2 className="mb-2 text-sm font-semibold text-white print:text-black">Movement totals</h2>
        <table className="mb-6 min-w-full text-left text-sm">
          <thead>
            <tr>
              <th className="border border-slate-600 px-3 py-2 print:border-black">Stage</th>
              {LETTER_ITEM_TYPE_ORDER.map((type) => (
                <th key={type} className="border border-slate-600 px-3 py-2 print:border-black">
                  {formatReplacementItemType(type)}
                </th>
              ))}
              <th className="border border-slate-600 px-3 py-2 print:border-black">Total</th>
            </tr>
          </thead>
          <tbody>
            {visibleStages.map((stage) => (
              <tr key={stage}>
                <td className="border border-slate-600 px-3 py-2 print:border-black">
                  {MOVEMENT_STAGE_LABELS[stage]}
                </td>
                {LETTER_ITEM_TYPE_ORDER.map((type) => (
                  <td key={type} className="border border-slate-600 px-3 py-2 print:border-black">
                    {report.stages[stage][type]}
                  </td>
                ))}
                <td className="border border-slate-600 px-3 py-2 font-semibold print:border-black">
                  {report.stages[stage].total}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <h2 className="mb-2 text-sm font-semibold text-white print:text-black">Claim-wise ledger</h2>
        {report.rows.length === 0 ? (
          <p className="text-sm text-slate-400 print:text-black">No replacement items found for this period.</p>
        ) : (
          <table className="min-w-full text-left text-xs">
            <thead>
              <tr>
                <th className="border border-slate-600 px-2 py-2 print:border-black">S.No</th>
                <th className="border border-slate-600 px-2 py-2 print:border-black">Received</th>
                <th className="border border-slate-600 px-2 py-2 print:border-black">Customer</th>
                <th className="border border-slate-600 px-2 py-2 print:border-black">Old items</th>
                <th className="border border-slate-600 px-2 py-2 print:border-black">Sent</th>
                <th className="border border-slate-600 px-2 py-2 print:border-black">Received at company</th>
                <th className="border border-slate-600 px-2 py-2 print:border-black">Location</th>
              </tr>
            </thead>
            <tbody>
              {report.rows.map((row, index) => (
                <tr key={row.claimId}>
                  <td className="border border-slate-600 px-2 py-2 print:border-black">{index + 1}</td>
                  <td className="border border-slate-600 px-2 py-2 print:border-black">
                    {formatReplacementDate(row.receivedDate)}
                  </td>
                  <td className="border border-slate-600 px-2 py-2 print:border-black">{row.customerName}</td>
                  <td className="border border-slate-600 px-2 py-2 print:border-black">{row.oldItems}</td>
                  <td className="border border-slate-600 px-2 py-2 print:border-black">
                    {formatReplacementDate(row.sentToCompanyDate)}
                  </td>
                  <td className="border border-slate-600 px-2 py-2 print:border-black">
                    {formatReplacementDate(row.companyReceivedDate)}
                  </td>
                  <td className="border border-slate-600 px-2 py-2 print:border-black">
                    {row.location}
                    {row.status !== "cancelled" && row.location !== formatReplacementStatus(row.status) ? (
                      <span className="mt-1 block text-[11px]">{formatReplacementStatus(row.status)}</span>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <div className="mt-10 text-sm text-slate-300 print:text-black">
          <p>
            Sent {report.stages.sentToCompany.total}, received at company{" "}
            {report.stages.receivedFromCompany.total}, returned {report.stages.returnedToCustomer.total}.
            Pending at company {report.stages.pendingAtCompany.total}. Pending with us{" "}
            {report.stages.pendingWithUs.total}.
          </p>
          <p className="mt-8">For {SITE_NAME}</p>
          <p className="mt-12">Authorised Signatory</p>
        </div>
      </div>
    </div>
  );
}
