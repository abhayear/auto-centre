"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { CalendarClock, Printer } from "lucide-react";
import { MarkdownContent } from "@/components/content/MarkdownContent";
import { ServiceDueCalculator } from "@/components/service-schedule/ServiceDueCalculator";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  ELECTRIC_SCOOTER_MILESTONES,
  formatScheduleDate,
} from "@/lib/electric-scooter-service-schedule";

type ServiceSchedulePageClientProps = {
  title: string;
  summary: string | null;
  content: string;
};

type PrintScope = "due-dates" | "maintenance-guide";

const printScopeOptions: { value: PrintScope; label: string; description: string }[] = [
  {
    value: "due-dates",
    label: "Service due dates only",
    description: "Customer details and personalized due-date table",
  },
  {
    value: "maintenance-guide",
    label: "Complete maintenance guide",
    description: "Full paid/free service and periodical maintenance checklist",
  },
];

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
  const [printScope, setPrintScope] = useState<PrintScope>("due-dates");

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

  function handlePrint() {
    window.print();
  }

  return (
    <div className="service-schedule-print-page mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8 print:max-w-none print:px-0 print:py-0">
      <div
        className="mb-6 rounded-xl border border-slate-700/50 bg-slate-800/40 p-5 print:hidden"
        data-print-hide
      >
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-300">
          Print customer schedule
        </h2>
        <p className="mt-1 text-sm text-slate-400">
          Fill customer details and delivery date below, then print the paid & free service and
          periodical maintenance schedule for this customer.
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
        <fieldset className="mt-4">
          <legend className="mb-2 text-sm font-medium text-slate-300">What to print</legend>
          <div className="space-y-2">
            {printScopeOptions.map((option) => (
              <label
                key={option.value}
                className="flex cursor-pointer gap-3 rounded-lg border border-slate-700/50 bg-slate-900/40 p-3 has-[:checked]:border-red-600/50 has-[:checked]:bg-red-950/20"
              >
                <input
                  type="radio"
                  name="printScope"
                  value={option.value}
                  checked={printScope === option.value}
                  onChange={() => setPrintScope(option.value)}
                  className="mt-1 accent-red-600"
                />
                <span>
                  <span className="block text-sm font-medium text-white">{option.label}</span>
                  <span className="block text-xs text-slate-400">{option.description}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>
        <div className="mt-4">
          <Button type="button" onClick={handlePrint} className="inline-flex items-center gap-2">
            <Printer className="h-4 w-4" />
            Print schedule
          </Button>
        </div>
      </div>

      <div
        id="service-schedule-print"
        className={`print:text-black ${printScope === "due-dates" ? "print-scope-due-dates" : "print-scope-maintenance-guide"}`}
      >
        <div className="mb-8 hidden border-b-2 border-black pb-4 print:block">
          <dl className="grid gap-2 text-sm sm:grid-cols-2">
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
          <MarkdownContent content={content} variant="print" />
        </div>

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
