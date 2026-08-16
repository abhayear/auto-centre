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
  REPLACEMENT_COMPANY,
  buildLetterItems,
  formatLetterQuantitySummary,
  formatReplacementDate,
  formatReplacementItemType,
  sumLetterQuantities,
  type SerializedReplacementClaim,
} from "@/lib/replacement-parts";

type ReplacementPartsPrintClientProps = {
  claims: SerializedReplacementClaim[];
  from?: string;
  to?: string;
  autoPrint?: boolean;
};

export function ReplacementPartsPrintClient({
  claims,
  from,
  to,
  autoPrint = false,
}: ReplacementPartsPrintClientProps) {
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

  const groupedItems = buildLetterItems(claims);
  const quantityTotals = sumLetterQuantities(groupedItems);
  const totalItems = quantityTotals.total;

  useEffect(() => {
    if (autoPrint) {
      const timer = window.setTimeout(() => window.print(), 300);
      return () => window.clearTimeout(timer);
    }
  }, [autoPrint]);

  return (
    <div className="replacement-parts-print mx-auto max-w-4xl px-4 py-8 print:max-w-none print:px-0 print:py-0">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4 print:hidden" data-print-hide>
        <p className="text-sm text-slate-400">
          Use your browser&apos;s print dialog and choose &quot;Save as PDF&quot; to export.
        </p>
        <Button onClick={() => window.print()}>Print / Save as PDF</Button>
      </div>

      <div id="replacement-parts-letter" className="print:text-black">
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
        </div>

        <div className="mb-6 text-sm text-slate-300 print:text-black">
          <p className="font-semibold">To,</p>
          <p className="mt-1 font-medium">{REPLACEMENT_COMPANY.name}</p>
          <p>{REPLACEMENT_COMPANY.address}</p>
          <p className="mt-4">Subject: Replacement of faulty parts</p>
          <p className="mt-4 leading-relaxed">
            Dear Sir/Madam,
          </p>
          <p className="mt-2 leading-relaxed">
            Please find below the list of faulty parts received from our customers for replacement
            under warranty. Kindly arrange replacement at the earliest.
          </p>
        </div>

        {totalItems === 0 ? (
          <p className="text-slate-400 print:text-black">No faulty items found for this selection.</p>
        ) : (
          <div>
          <div className="mb-8 overflow-x-auto rounded-lg border border-slate-700/50 print:border-black">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-800/80 text-slate-200 print:bg-white print:text-black">
                <tr>
                  <th className="px-3 py-2 print:border print:border-black">Item</th>
                  <th className="px-3 py-2 print:border print:border-black">Total qty</th>
                </tr>
              </thead>
              <tbody className="text-slate-300 print:text-black">
                {LETTER_ITEM_TYPE_ORDER.map((itemType) => (
                  <tr key={itemType}>
                    <td className="px-3 py-2 print:border print:border-black">
                      {formatReplacementItemType(itemType)}
                    </td>
                    <td className="px-3 py-2 print:border print:border-black">
                      {quantityTotals[itemType]}
                    </td>
                  </tr>
                ))}
                <tr className="font-semibold">
                  <td className="px-3 py-2 print:border print:border-black">Grand total</td>
                  <td className="px-3 py-2 print:border print:border-black">{quantityTotals.total}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="space-y-8">
            {LETTER_ITEM_TYPE_ORDER.map((itemType) => {
              const rows = groupedItems[itemType];
              if (rows.length === 0) return null;
              const typeTotal = quantityTotals[itemType];

              return (
                <div key={itemType}>
                  <h2 className="mb-3 text-lg font-semibold text-white print:text-black">
                    {formatReplacementItemType(itemType)} — Total {typeTotal}
                  </h2>
                  <div className="overflow-x-auto rounded-lg border border-slate-700/50 print:border-black">
                    <table className="min-w-full text-left text-sm">
                      <thead className="bg-slate-800/80 text-slate-200 print:bg-white print:text-black">
                        <tr>
                          <th className="px-3 py-2 print:border print:border-black">S.No</th>
                          <th className="px-3 py-2 print:border print:border-black">Date</th>
                          <th className="px-3 py-2 print:border print:border-black">Customer</th>
                          <th className="px-3 py-2 print:border print:border-black">Bill No</th>
                          <th className="px-3 py-2 print:border print:border-black">Model</th>
                          <th className="px-3 py-2 print:border print:border-black">Serial</th>
                          <th className="px-3 py-2 print:border print:border-black">Specs</th>
                          <th className="px-3 py-2 print:border print:border-black">Qty</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-700/50 print:divide-black">
                        {rows.map((row, index) => (
                          <tr key={`${row.claimId}-${index}`} className="text-slate-300 print:text-black">
                            <td className="px-3 py-2 print:border print:border-black">{index + 1}</td>
                            <td className="px-3 py-2 print:border print:border-black">
                              {formatReplacementDate(row.receivedDate)}
                            </td>
                            <td className="px-3 py-2 print:border print:border-black">
                              {row.customerName}
                            </td>
                            <td className="px-3 py-2 print:border print:border-black">
                              {row.billNumber ?? "—"}
                            </td>
                            <td className="px-3 py-2 print:border print:border-black">
                              {row.modelCode ?? "—"}
                            </td>
                            <td className="px-3 py-2 print:border print:border-black">
                              {row.serialNumber ?? "—"}
                            </td>
                            <td className="px-3 py-2 print:border print:border-black">{row.specs}</td>
                            <td className="px-3 py-2 print:border print:border-black">{row.quantity}</td>
                          </tr>
                        ))}
                        <tr className="font-semibold text-slate-200 print:text-black">
                          <td className="px-3 py-2 print:border print:border-black" colSpan={7}>
                            Total {formatReplacementItemType(itemType)}
                          </td>
                          <td className="px-3 py-2 print:border print:border-black">{typeTotal}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
          </div>
          </div>
        )}

        <div className="mt-10 text-sm text-slate-300 print:text-black">
          <p>Total: {formatLetterQuantitySummary(quantityTotals)}</p>
          <p className="mt-8">Thanking you,</p>
          <p className="mt-6 font-semibold">For {SITE_NAME}</p>
          <p className="mt-12">Authorised Signatory</p>
        </div>
      </div>
    </div>
  );
}
