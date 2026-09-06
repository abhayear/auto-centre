"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { CalendarClock, FileDown } from "lucide-react";
import { MarkdownContent } from "@/components/content/MarkdownContent";
import { ServiceDueCalculator } from "@/components/service-schedule/ServiceDueCalculator";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import {
  ELECTRIC_SCOOTER_MILESTONES,
  formatScheduleDate,
} from "@/lib/electric-scooter-service-schedule";
import { splitServiceScheduleContent } from "@/lib/service-schedule-content";
import {
  SERVICE_SCHEDULE_PAPER_OPTIONS,
  isServiceSchedulePaperSize,
  serviceSchedulePrintMaxHeightMm,
  type ServiceSchedulePaperSize,
} from "@/lib/service-schedule-paper";

type ServiceSchedulePageClientProps = {
  title: string;
  summary: string | null;
  content: string;
};

function formatDeliveryDateInput(value: string): string {
  if (!value) return "—";
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) return value;
  return formatScheduleDate(parsed);
}

export function ServiceSchedulePageClient({
  title,
  summary,
  content,
}: ServiceSchedulePageClientProps) {
  const [customerName, setCustomerName] = useState("");
  const [billNo, setBillNo] = useState("");
  const [deliveryDate, setDeliveryDate] = useState("");
  const [lastCompleted, setLastCompleted] = useState("");
  const [paperSize, setPaperSize] = useState<ServiceSchedulePaperSize>("A4");

  const lastCompletedLabel = useMemo(() => {
    if (!lastCompleted) return "None completed yet";
    return (
      ELECTRIC_SCOOTER_MILESTONES.find((m) => m.id === lastCompleted)?.label ?? lastCompleted
    );
  }, [lastCompleted]);

  const printedOn = useMemo(
    () =>
      new Date().toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }),
    [],
  );

  const { main: scheduleMainContent, bookSection } = useMemo(
    () => splitServiceScheduleContent(content),
    [content],
  );

  const printMaxHeightMm = serviceSchedulePrintMaxHeightMm(paperSize);

  useEffect(() => {
    document.documentElement.dataset.schedulePaper = paperSize;
    document.documentElement.style.setProperty(
      "--service-schedule-print-max-height",
      `${printMaxHeightMm}mm`,
    );
    return () => {
      delete document.documentElement.dataset.schedulePaper;
      document.documentElement.style.removeProperty("--service-schedule-print-max-height");
    };
  }, [paperSize, printMaxHeightMm]);

  function handleSaveAsPdf() {
    window.print();
  }

  return (
    <div className="service-schedule-print-page mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8 print:max-w-none print:px-0 print:py-0">
      <div
        className="mb-6 rounded-xl border border-slate-700/50 bg-slate-800/40 p-5 print:hidden"
        data-print-hide
      >
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-300">
          Save customer schedule as PDF
        </h2>
        <p className="mt-1 text-sm text-slate-400">
          Fill customer details and delivery date, pick a paper size, then save as PDF. In the
          dialog, choose &quot;Save as PDF&quot; as the destination and turn off headers and
          footers.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Input
            id="customerName"
            label="Customer name"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            placeholder="e.g. Rahul Sharma"
          />
          <Input
            id="billNo"
            label="Bill / job card no."
            value={billNo}
            onChange={(e) => setBillNo(e.target.value)}
            placeholder="e.g. AG-2026-0142"
          />
        </div>
        <div className="mt-4 flex flex-wrap items-end gap-3">
          <div className="w-full sm:w-48">
            <Select
              id="paperSize"
              label="Paper size"
              value={paperSize}
              options={SERVICE_SCHEDULE_PAPER_OPTIONS}
              onChange={(e) => {
                if (isServiceSchedulePaperSize(e.target.value)) {
                  setPaperSize(e.target.value);
                }
              }}
            />
          </div>
          <Button type="button" onClick={handleSaveAsPdf} className="inline-flex items-center gap-2">
            <FileDown className="h-4 w-4" />
            Save as PDF
          </Button>
        </div>
      </div>

      <style>{`@media print { @page { size: ${paperSize} portrait; margin: 8mm; } }`}</style>
      <div
        id="service-schedule-print"
        className="print-scope-due-dates print:text-black"
      >
        <div className="mb-8 hidden border-b-2 border-black pb-4 print:mb-2 print:block print:pb-2">
          <dl className="grid gap-2 text-sm sm:grid-cols-2 print:gap-1 print:text-xs">
            <div>
              <dt className="font-semibold">Customer name</dt>
              <dd>{customerName.trim() || "—"}</dd>
            </div>
            <div>
              <dt className="font-semibold">Bill / job card no.</dt>
              <dd>{billNo.trim() || "—"}</dd>
            </div>
            <div>
              <dt className="font-semibold">Delivery / purchase date</dt>
              <dd>{formatDeliveryDateInput(deliveryDate)}</dd>
            </div>
            <div>
              <dt className="font-semibold">Last completed service</dt>
              <dd>{lastCompletedLabel}</dd>
            </div>
            <div>
              <dt className="font-semibold">Printed on</dt>
              <dd>{printedOn}</dd>
            </div>
          </dl>
        </div>

        <div className="mb-10 print:mb-6" data-print-section="maintenance-title">
          <div className="mb-3 flex items-center gap-2 text-red-400 print:text-red-800">
            <CalendarClock className="h-6 w-6" />
            <span className="text-sm font-medium uppercase tracking-wider">Maintenance guide</span>
          </div>
          <h1 className="text-3xl font-bold text-white sm:text-4xl print:text-2xl print:text-black">
            {title}
          </h1>
          {summary ? (
            <p className="mt-4 text-lg leading-relaxed text-slate-300 print:text-sm print:text-black">
              {summary}
            </p>
          ) : null}
        </div>

        <div data-print-section="due-dates">
          <ServiceDueCalculator
            deliveryDate={deliveryDate}
            onDeliveryDateChange={setDeliveryDate}
            lastCompleted={lastCompleted}
            onLastCompletedChange={setLastCompleted}
          />
        </div>

        <div
          className="rounded-xl border border-slate-700/50 bg-slate-800/20 p-6 sm:p-8 print:mt-4 print:border-black print:bg-white print:p-0"
          data-print-section="maintenance-content"
        >
          <MarkdownContent content={scheduleMainContent} variant="print" />
        </div>

        {bookSection ? (
          <div
            className="mt-6 rounded-xl border border-slate-700/50 bg-slate-800/20 p-6 sm:p-8 print:hidden"
            data-print-hide
          >
            <MarkdownContent content={bookSection} />
          </div>
        ) : null}

        <div
          className="mt-10 rounded-xl border border-red-600/30 bg-gradient-to-r from-red-600/20 to-red-700/10 p-8 text-center print:hidden"
          data-print-hide
        >
          <h2 className="text-xl font-bold text-white">Book your next service</h2>
          <p className="mt-2 text-slate-400">
            Doorstep service available in Lalitpur and nearby areas.
          </p>
          <Link
            href="/book-service"
            className="mt-4 inline-block rounded-lg bg-red-600 px-6 py-3 font-medium text-white hover:bg-red-700"
          >
            Book Service
          </Link>
        </div>
      </div>
    </div>
  );
}
