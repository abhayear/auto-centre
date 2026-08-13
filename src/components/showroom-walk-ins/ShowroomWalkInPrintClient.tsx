"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { SITE_NAME } from "@/lib/constants";
import {
  formatShowroomDate,
  formatShowroomPaymentMode,
  type SerializedShowroomWalkIn,
} from "@/lib/showroom-walk-ins";

type ShowroomWalkInPrintClientProps = {
  enquiries: SerializedShowroomWalkIn[];
  from?: string;
  to?: string;
  autoPrint?: boolean;
};

export function ShowroomWalkInPrintClient({
  enquiries,
  from,
  to,
  autoPrint = false,
}: ShowroomWalkInPrintClientProps) {
  const printedOn = new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date());

  const dateRangeLabel =
    from && to
      ? `${formatShowroomDate(from)} – ${formatShowroomDate(to)}`
      : from
        ? `From ${formatShowroomDate(from)}`
        : to
          ? `Up to ${formatShowroomDate(to)}`
          : "All dates";

  useEffect(() => {
    if (autoPrint) {
      const timer = window.setTimeout(() => window.print(), 300);
      return () => window.clearTimeout(timer);
    }
  }, [autoPrint]);

  return (
    <div className="showroom-walk-ins-print mx-auto max-w-6xl px-4 py-8 print:max-w-none print:px-0 print:py-0">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4 print:hidden" data-print-hide>
        <p className="text-sm text-slate-400">
          Use your browser&apos;s print dialog and choose &quot;Save as PDF&quot; to export.
        </p>
        <Button onClick={() => window.print()}>Print / Save as PDF</Button>
      </div>

      <div id="showroom-walk-ins-print" className="print:text-black">
        <div className="mb-6 border-b-2 border-black pb-4">
          <h1 className="text-2xl font-bold text-white print:text-black">
            Showroom walk-in enquiries
          </h1>
          <p className="mt-1 text-sm text-slate-400 print:text-black">{SITE_NAME}</p>
          <dl className="mt-3 grid gap-1 text-sm text-slate-300 print:text-black sm:grid-cols-2">
            <div>
              <dt className="inline font-medium">Date range: </dt>
              <dd className="inline">{dateRangeLabel}</dd>
            </div>
            <div>
              <dt className="inline font-medium">Exported: </dt>
              <dd className="inline">{printedOn}</dd>
            </div>
            <div>
              <dt className="inline font-medium">Total entries: </dt>
              <dd className="inline">{enquiries.length}</dd>
            </div>
          </dl>
        </div>

        {enquiries.length === 0 ? (
          <p className="text-slate-400 print:text-black">No walk-in enquiries found.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-slate-700/50 print:border-black">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-800/80 text-slate-200 print:bg-white print:text-black">
                <tr>
                  <th className="px-3 py-2 print:border print:border-black">Date</th>
                  <th className="px-3 py-2 print:border print:border-black">Name</th>
                  <th className="px-3 py-2 print:border print:border-black">Required model</th>
                  <th className="px-3 py-2 print:border print:border-black">Contact</th>
                  <th className="px-3 py-2 print:border print:border-black">Address</th>
                  <th className="px-3 py-2 print:border print:border-black">Payment</th>
                  <th className="px-3 py-2 print:border print:border-black">Expected purchase</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50 print:divide-black">
                {enquiries.map((enquiry, index) => (
                  <tr key={`${enquiry.enquiryDate}-${enquiry.name}-${index}`} className="text-slate-300 print:text-black">
                    <td className="px-3 py-2 print:border print:border-black">
                      {formatShowroomDate(enquiry.enquiryDate)}
                    </td>
                    <td className="px-3 py-2 print:border print:border-black">{enquiry.name}</td>
                    <td className="px-3 py-2 print:border print:border-black">
                      {enquiry.requiredModel}
                    </td>
                    <td className="px-3 py-2 print:border print:border-black">
                      {enquiry.contactNumber ?? "—"}
                    </td>
                    <td className="px-3 py-2 print:border print:border-black">
                      {enquiry.address ?? "—"}
                    </td>
                    <td className="px-3 py-2 print:border print:border-black">
                      {formatShowroomPaymentMode(enquiry.paymentMode)}
                    </td>
                    <td className="px-3 py-2 print:border print:border-black">
                      {formatShowroomDate(enquiry.expectedPurchaseDate)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
