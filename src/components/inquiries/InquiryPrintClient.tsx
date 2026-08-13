"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { SITE_NAME } from "@/lib/constants";
import { formatDate, formatPrice } from "@/lib/utils";
import { formatShowroomDate } from "@/lib/showroom-walk-ins";

export type InquiryPrintRow = {
  id: string;
  type: string;
  name: string;
  email: string;
  phone: string | null;
  message: string;
  status: string;
  createdAt: string;
  vehicleLabel: string | null;
  bookingAmountAtBooking: number | null;
  paymentStatus: string;
  refundAmountAtBooking: number | null;
};

type InquiryPrintClientProps = {
  inquiries: InquiryPrintRow[];
  statusFilter?: string;
  typeFilter?: string;
  from?: string;
  to?: string;
  autoPrint?: boolean;
};

function formatInquiryType(type: string): string {
  return type.replace(/_/g, " ");
}

export function InquiryPrintClient({
  inquiries,
  statusFilter,
  typeFilter,
  from,
  to,
  autoPrint = false,
}: InquiryPrintClientProps) {
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
          : null;

  const filterLabel = [
    dateRangeLabel ? `Dates: ${dateRangeLabel}` : null,
    typeFilter ? `Type: ${formatInquiryType(typeFilter)}` : null,
    statusFilter ? `Status: ${statusFilter}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  useEffect(() => {
    if (autoPrint) {
      const timer = window.setTimeout(() => window.print(), 300);
      return () => window.clearTimeout(timer);
    }
  }, [autoPrint]);

  return (
    <div className="inquiries-print mx-auto max-w-6xl px-4 py-8 print:max-w-none print:px-0 print:py-0">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4 print:hidden" data-print-hide>
        <p className="text-sm text-slate-400">
          Use your browser&apos;s print dialog and choose &quot;Save as PDF&quot; to export.
        </p>
        <Button onClick={() => window.print()}>Print / Save as PDF</Button>
      </div>

      <div id="inquiries-print" className="print:text-black">
        <div className="mb-6 border-b-2 border-black pb-4">
          <h1 className="text-2xl font-bold text-white print:text-black">Contact enquiries</h1>
          <p className="mt-1 text-sm text-slate-400 print:text-black">{SITE_NAME}</p>
          <dl className="mt-3 grid gap-1 text-sm text-slate-300 print:text-black sm:grid-cols-2">
            {filterLabel && (
              <div>
                <dt className="inline font-medium">Filters: </dt>
                <dd className="inline">{filterLabel}</dd>
              </div>
            )}
            <div>
              <dt className="inline font-medium">Exported: </dt>
              <dd className="inline">{printedOn}</dd>
            </div>
            <div>
              <dt className="inline font-medium">Total entries: </dt>
              <dd className="inline">{inquiries.length}</dd>
            </div>
          </dl>
        </div>

        {inquiries.length === 0 ? (
          <p className="text-slate-400 print:text-black">No enquiries found.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-slate-700/50 print:border-black">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-800/80 text-slate-200 print:bg-white print:text-black">
                <tr>
                  <th className="px-3 py-2 print:border print:border-black">Date</th>
                  <th className="px-3 py-2 print:border print:border-black">Name</th>
                  <th className="px-3 py-2 print:border print:border-black">Email</th>
                  <th className="px-3 py-2 print:border print:border-black">Phone</th>
                  <th className="px-3 py-2 print:border print:border-black">Type</th>
                  <th className="px-3 py-2 print:border print:border-black">Status</th>
                  <th className="px-3 py-2 print:border print:border-black">Vehicle</th>
                  <th className="px-3 py-2 print:border print:border-black">Message</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50 print:divide-black">
                {inquiries.map((inquiry) => (
                  <tr key={inquiry.id} className="text-slate-300 print:text-black">
                    <td className="px-3 py-2 align-top print:border print:border-black whitespace-nowrap">
                      {formatDate(inquiry.createdAt)}
                    </td>
                    <td className="px-3 py-2 align-top print:border print:border-black">
                      {inquiry.name}
                    </td>
                    <td className="px-3 py-2 align-top print:border print:border-black">
                      {inquiry.email}
                    </td>
                    <td className="px-3 py-2 align-top print:border print:border-black">
                      {inquiry.phone ?? "—"}
                    </td>
                    <td className="px-3 py-2 align-top print:border print:border-black capitalize">
                      {formatInquiryType(inquiry.type)}
                    </td>
                    <td className="px-3 py-2 align-top print:border print:border-black capitalize">
                      {inquiry.status}
                    </td>
                    <td className="px-3 py-2 align-top print:border print:border-black">
                      {inquiry.vehicleLabel ?? "—"}
                      {inquiry.bookingAmountAtBooking != null &&
                        inquiry.bookingAmountAtBooking > 0 && (
                          <span className="block text-xs">
                            {formatPrice(inquiry.bookingAmountAtBooking)} · {inquiry.paymentStatus}
                          </span>
                        )}
                      {inquiry.refundAmountAtBooking != null &&
                        inquiry.refundAmountAtBooking > 0 && (
                          <span className="block text-xs">
                            Refund: {formatPrice(inquiry.refundAmountAtBooking)}
                          </span>
                        )}
                    </td>
                    <td className="px-3 py-2 align-top print:border print:border-black max-w-xs">
                      {inquiry.message}
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
