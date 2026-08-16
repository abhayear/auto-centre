"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/Button";
import {
  SITE_ADDRESS,
  SITE_NAME,
  SITE_PHONE,
} from "@/lib/constants";
import {
  LETTER_ITEM_TYPE_ORDER,
  MOVEMENT_REPORT_STAGES,
  MOVEMENT_REPORT_TITLES,
  MOVEMENT_STAGE_LABELS,
  buildMovementReport,
  formatReplacementDate,
  formatReplacementItemType,
  formatReplacementStatus,
  type MovementReportKind,
  type SerializedReplacementClaim,
} from "@/lib/replacement-parts";

type MovementReportPrintClientProps = {
  claims: SerializedReplacementClaim[];
  from?: string;
  to?: string;
  autoPrint?: boolean;
  kind?: MovementReportKind;
};

export function MovementReportPrintClient({
  claims,
  from,
  to,
  autoPrint = false,
  kind = "movement",
}: MovementReportPrintClientProps) {
  const printedOn = new Intl.DateTimeFormat("en-IN", {
    dateStyle: "long",
  }).format(new Date());

  const dateRangeLabel =
    from && to
      ? `${formatReplacementDate(from)} – ${formatReplacementDate(to)}`
      : from
        ? `From ${formatReplacementDate(from)}`
        : to
          ? `Up to ${formatReplacementDate(to)}`
          : "All dates";

  const report = buildMovementReport(claims, kind);
  const visibleStages = MOVEMENT_REPORT_STAGES[kind];
  const emptyMessage =
    kind === "sent"
      ? "No items sent to company for this period."
      : kind === "received"
        ? "No items received from company for this period."
        : "No replacement claims found for this period.";

  useEffect(() => {
    if (autoPrint) {
      const timer = window.setTimeout(() => window.print(), 300);
      return () => window.clearTimeout(timer);
    }
  }, [autoPrint]);

  return (
    <div className="replacement-parts-print mx-auto max-w-6xl px-4 py-8 print:max-w-none print:px-0 print:py-0">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4 print:hidden" data-print-hide>
        <p className="text-sm text-slate-400">
          Use your browser&apos;s print dialog and choose &quot;Save as PDF&quot; to export.
        </p>
        <Button onClick={() => window.print()}>Print / Save as PDF</Button>
      </div>

      <div id="replacement-parts-movement-report" className="print:text-black">
        <div className="mb-8 border-b-2 border-black pb-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-white print:text-black">{SITE_NAME}</h1>
              <p className="mt-1 text-sm text-slate-400 print:text-black">{SITE_ADDRESS}</p>
              <p className="text-sm text-slate-400 print:text-black">Phone: {SITE_PHONE}</p>
            </div>
            <div className="text-right text-sm text-slate-300 print:text-black">
              <p>Date: {printedOn}</p>
              <p className="mt-1">Period: {dateRangeLabel}</p>
            </div>
          </div>
          <h2 className="mt-6 text-xl font-semibold text-white print:text-black">
            {MOVEMENT_REPORT_TITLES[kind]}
          </h2>
          <p className="mt-1 text-sm text-slate-400 print:text-black">
            Battery, Charger, Motor, Controller respectively
          </p>
        </div>

        <div className="mb-8 overflow-x-auto rounded-lg border border-slate-700/50 print:border-black">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-800/80 text-slate-200 print:bg-white print:text-black">
              <tr>
                <th className="px-3 py-2 print:border print:border-black">Stage</th>
                {LETTER_ITEM_TYPE_ORDER.map((type) => (
                  <th key={type} className="px-3 py-2 print:border print:border-black">
                    {formatReplacementItemType(type)}
                  </th>
                ))}
                <th className="px-3 py-2 print:border print:border-black">Total</th>
              </tr>
            </thead>
            <tbody className="text-slate-300 print:text-black">
              {visibleStages.map((stage) => (
                <tr key={stage} className={stage.startsWith("pending") ? "font-medium" : undefined}>
                  <td className="px-3 py-2 print:border print:border-black">
                    {MOVEMENT_STAGE_LABELS[stage]}
                  </td>
                  {LETTER_ITEM_TYPE_ORDER.map((type) => (
                    <td key={type} className="px-3 py-2 print:border print:border-black">
                      {report.stages[stage][type]}
                    </td>
                  ))}
                  <td className="px-3 py-2 font-semibold print:border print:border-black">
                    {report.stages[stage].total}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {kind === "movement" && (
        <p className="mb-8 text-xs text-slate-400 print:text-black">
          Pending at company = Sent to company − Received from company. Pending with us =
          (Received from customer − Sent to company) + (Received from company − Returned to
          customer). Returned to customer counts new items handed over, not old qty sent.
        </p>
        )}
        {kind === "sent" && (
          <p className="mb-8 text-xs text-slate-400 print:text-black">
            Pending at company = Sent to company − Received from company.
          </p>
        )}
        {kind === "received" && (
          <p className="mb-8 text-xs text-slate-400 print:text-black">
            Pending with us (from this report) = Received from company − Returned to customer.
          </p>
        )}

        {report.rows.length === 0 ? (
          <p className="text-slate-400 print:text-black">{emptyMessage}</p>
        ) : (
          <div>
            <h3 className="mb-3 text-lg font-semibold text-white print:text-black">
              Claim-wise ledger
            </h3>
            <div className="overflow-x-auto rounded-lg border border-slate-700/50 print:border-black">
              <table className="min-w-full text-left text-xs">
                <thead className="bg-slate-800/80 text-slate-200 print:bg-white print:text-black">
                  <tr>
                    <th className="px-2 py-2 print:border print:border-black">S.No</th>
                    <th className="px-2 py-2 print:border print:border-black">Date</th>
                    <th className="px-2 py-2 print:border print:border-black">Customer</th>
                    <th className="px-2 py-2 print:border print:border-black">Phone</th>
                    <th className="px-2 py-2 print:border print:border-black">Bill No</th>
                    <th className="px-2 py-2 print:border print:border-black">Old items</th>
                    <th className="px-2 py-2 print:border print:border-black">New items</th>
                    <th className="px-2 py-2 print:border print:border-black">Sent</th>
                    <th className="px-2 py-2 print:border print:border-black">From company</th>
                    <th className="px-2 py-2 print:border print:border-black">Current location</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/50 print:divide-black">
                  {report.rows.map((row, index) => (
                    <tr key={row.claimId} className="text-slate-300 print:text-black">
                      <td className="px-2 py-2 print:border print:border-black">{index + 1}</td>
                      <td className="whitespace-nowrap px-2 py-2 print:border print:border-black">
                        {formatReplacementDate(row.receivedDate)}
                      </td>
                      <td className="px-2 py-2 print:border print:border-black">{row.customerName}</td>
                      <td className="px-2 py-2 print:border print:border-black">
                        {row.customerPhone ?? "—"}
                      </td>
                      <td className="px-2 py-2 print:border print:border-black">
                        {row.billNumber ?? "—"}
                      </td>
                      <td className="px-2 py-2 print:border print:border-black">{row.oldItems}</td>
                      <td className="px-2 py-2 print:border print:border-black">{row.newItems}</td>
                      <td className="whitespace-nowrap px-2 py-2 print:border print:border-black">
                        {formatReplacementDate(row.sentToCompanyDate)}
                      </td>
                      <td className="whitespace-nowrap px-2 py-2 print:border print:border-black">
                        {formatReplacementDate(row.companyReceivedDate)}
                      </td>
                      <td className="px-2 py-2 print:border print:border-black">
                        {row.location}
                        {row.status !== "cancelled" && row.location !== formatReplacementStatus(row.status) ? (
                          <span className="mt-1 block text-[11px] text-slate-500 print:text-black">
                            {formatReplacementStatus(row.status)}
                          </span>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="mt-10 text-sm text-slate-300 print:text-black">
          <p>
            {kind === "sent"
              ? `Sent ${report.stages.sentToCompany.total}, received back ${report.stages.receivedFromCompany.total}, pending at company ${report.stages.pendingAtCompany.total}.`
              : kind === "received"
                ? `Received from company ${report.stages.receivedFromCompany.total}, returned to customer ${report.stages.returnedToCustomer.total}, pending with us ${report.stages.pendingWithUs.total}.`
                : `Pending at company ${report.stages.pendingAtCompany.total} = sent ${report.stages.sentToCompany.total} − received from company ${report.stages.receivedFromCompany.total}. Pending with us ${report.stages.pendingWithUs.total} = (received from customer ${report.stages.receivedFromCustomer.total} − sent ${report.stages.sentToCompany.total}) + (received from company ${report.stages.receivedFromCompany.total} − returned ${report.stages.returnedToCustomer.total}).`}
          </p>
          <p className="mt-8">For {SITE_NAME}</p>
          <p className="mt-12">Authorised Signatory</p>
        </div>
      </div>
    </div>
  );
}
