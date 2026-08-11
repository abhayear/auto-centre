"use client";

import Link from "next/link";
import { useMemo } from "react";
import { CalendarClock, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import {
  ELECTRIC_SCOOTER_MILESTONES,
  formatScheduleDate,
  getAnnualServiceReminders,
  getMilestoneDueDates,
  getNextServiceDue,
  GENERAL_MAINTENANCE_INTERVAL_DAYS,
  isOemScheduleComplete,
  OEM_SCHEDULE_DAYS,
} from "@/lib/electric-scooter-service-schedule";

const statusStyles: Record<string, string> = {
  overdue: "border-red-500/50 bg-red-950/30 text-red-300",
  "due-soon": "border-amber-500/50 bg-amber-950/20 text-amber-200",
  upcoming: "border-slate-700 bg-slate-900/40 text-slate-300",
  completed: "border-emerald-700/40 bg-emerald-950/20 text-emerald-300",
};

const dealerStampColumnClass =
  "min-w-[10rem] px-3 py-2 print:border print:border-black";

function DealerStampHeader() {
  return (
    <th className={dealerStampColumnClass}>Dealer stamp / signature</th>
  );
}

function DealerStampCell() {
  return (
    <td className={`${dealerStampColumnClass} align-bottom`}>
      <div
        className="flex min-h-12 flex-col justify-end print:min-h-16"
        aria-hidden="true"
      >
        <div className="border-b border-slate-600 print:border-black" />
      </div>
    </td>
  );
}

type ServiceDueCalculatorProps = {
  deliveryDate: string;
  onDeliveryDateChange: (value: string) => void;
  lastCompleted: string;
  onLastCompletedChange: (value: string) => void;
};

export function ServiceDueCalculator({
  deliveryDate,
  onDeliveryDateChange,
  lastCompleted,
  onLastCompletedChange,
}: ServiceDueCalculatorProps) {
  const milestones = useMemo(() => {
    if (!deliveryDate) return null;
    const parsed = new Date(`${deliveryDate}T00:00:00.000Z`);
    if (Number.isNaN(parsed.getTime())) return null;
    return getMilestoneDueDates(parsed, new Date(), lastCompleted || undefined);
  }, [deliveryDate, lastCompleted]);

  const annualReminders = useMemo(() => {
    if (!deliveryDate) return null;
    const parsed = new Date(`${deliveryDate}T00:00:00.000Z`);
    if (Number.isNaN(parsed.getTime())) return null;
    return getAnnualServiceReminders(parsed, new Date(), lastCompleted || undefined);
  }, [deliveryDate, lastCompleted]);

  const oemComplete = useMemo(() => {
    if (!deliveryDate) return false;
    const parsed = new Date(`${deliveryDate}T00:00:00.000Z`);
    if (Number.isNaN(parsed.getTime())) return false;
    return isOemScheduleComplete(parsed, new Date(), lastCompleted || undefined);
  }, [deliveryDate, lastCompleted]);

  const nextDue = useMemo(() => {
    if (!deliveryDate) return null;
    const parsed = new Date(`${deliveryDate}T00:00:00.000Z`);
    if (Number.isNaN(parsed.getTime())) return null;
    return getNextServiceDue(parsed, new Date(), lastCompleted || undefined);
  }, [deliveryDate, lastCompleted]);

  return (
    <section className="mb-10 rounded-xl border border-red-600/30 bg-slate-900/50 p-6 print:mb-4 print:border-black print:bg-white print:p-0">
      <div className="mb-4 flex items-center gap-2 text-red-400 print:hidden">
        <CalendarClock className="h-5 w-5" />
        <h2 className="text-lg font-semibold text-white">When is my next service due?</h2>
      </div>
      <h2 className="mb-3 hidden text-lg font-bold text-black print:block">
        Service due dates for this customer
      </h2>
      <p className="mb-4 text-sm text-slate-400 print:hidden">
        Enter your electric scooter delivery date to see free & paid service milestones. Services
        must be done on time to keep warranty valid. After the 10th service (day {OEM_SCHEDULE_DAYS}), general
        paid maintenance reminders continue every {GENERAL_MAINTENANCE_INTERVAL_DAYS} days.
      </p>

      <div className="grid gap-4 sm:grid-cols-2 print:hidden">
        <Input
          id="deliveryDate"
          type="date"
          label="Delivery / purchase date"
          value={deliveryDate}
          onChange={(e) => onDeliveryDateChange(e.target.value)}
        />
        <Select
          id="lastCompleted"
          label="Last completed service (optional)"
          value={lastCompleted}
          onChange={(e) => onLastCompletedChange(e.target.value)}
          options={[
            { value: "", label: "None completed yet" },
            ...ELECTRIC_SCOOTER_MILESTONES.map((m) => ({ value: m.id, label: m.label })),
          ]}
        />
      </div>

      {nextDue ? (
        <div
          className={`mt-5 rounded-lg border p-4 print:mt-3 print:border-black print:bg-white print:p-3 ${statusStyles[nextDue.status] ?? statusStyles.upcoming} print:text-black`}
        >
          <p className="text-sm font-medium uppercase tracking-wide opacity-80 print:text-black">
            {nextDue.type === "annual" ? "Next general paid maintenance" : "Next service due"}
          </p>
          <p className="mt-1 text-xl font-bold text-white print:text-base print:text-black">
            {nextDue.label}
          </p>
          <p className="mt-1 text-sm print:text-black">
            Due by <strong>{formatScheduleDate(nextDue.dueDate)}</strong>
            {nextDue.status === "overdue"
              ? ` · ${Math.abs(nextDue.daysUntilDue)} days overdue`
              : nextDue.status === "due-soon"
                ? ` · within ${nextDue.daysUntilDue} days`
                : ` · in ${nextDue.daysUntilDue} days`}
          </p>
          {nextDue.type === "annual" ? (
            <p className="mt-2 text-sm opacity-90 print:text-xs print:text-black">
              OEM warranty schedule ends at 10th PS (day {OEM_SCHEDULE_DAYS}). Book general paid maintenance every{" "}
              {GENERAL_MAINTENANCE_INTERVAL_DAYS} days for brakes, tyres, battery health, and safety checks.
            </p>
          ) : null}
          {nextDue.status === "overdue" && nextDue.type !== "annual" ? (
            <p className="mt-2 flex items-center gap-1 text-sm text-red-300 print:hidden">
              <AlertTriangle className="h-4 w-4" />
              Overdue service may affect warranty — book immediately.
            </p>
          ) : null}
          <Link href="/book-service" className="mt-4 inline-block print:hidden">
            <Button type="button">Book this service</Button>
          </Link>
        </div>
      ) : null}

      {milestones ? (
        <div className="mt-6 overflow-x-auto rounded-lg border border-slate-700/50 print:mt-3 print:border-black">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-800/80 text-slate-200 print:bg-white print:text-black">
              <tr>
                <th className="px-3 py-2 print:border print:border-black">Service</th>
                <th className="px-3 py-2 print:border print:border-black">Day</th>
                <th className="px-3 py-2 print:border print:border-black">Due date</th>
                <DealerStampHeader />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50 print:divide-black">
              {milestones.map((m) => (
                <tr key={m.id} className="text-slate-300 print:text-black">
                  <td className="px-3 py-2 print:border print:border-black">
                    {m.shortLabel}
                    <span className="ml-1 text-xs text-slate-500 print:text-black">
                      ({m.type === "free" ? "Free" : "Paid"})
                    </span>
                  </td>
                  <td className="px-3 py-2 print:border print:border-black">{m.days}</td>
                  <td className="px-3 py-2 print:border print:border-black">
                    {formatScheduleDate(m.dueDate)}
                  </td>
                  <DealerStampCell />
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {oemComplete && annualReminders && annualReminders.length > 0 ? (
        <div className="mt-6 print:mt-3">
          <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-400 print:text-black">
            General paid maintenance (every {GENERAL_MAINTENANCE_INTERVAL_DAYS} days after 10th PS)
          </h3>
          <div className="overflow-x-auto rounded-lg border border-slate-700/50 print:border-black">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-800/80 text-slate-200 print:bg-white print:text-black">
                <tr>
                  <th className="px-3 py-2 print:border print:border-black">Service</th>
                  <th className="px-3 py-2 print:border print:border-black">Due date</th>
                  <DealerStampHeader />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50 print:divide-black">
                {annualReminders.map((a) => (
                  <tr key={a.id} className="text-slate-300 print:text-black">
                    <td className="px-3 py-2 print:border print:border-black">
                      {a.shortLabel}
                      <span className="ml-1 text-xs text-slate-500 print:text-black">(Paid)</span>
                    </td>
                    <td className="px-3 py-2 print:border print:border-black">
                      {formatScheduleDate(a.dueDate)}
                    </td>
                    <DealerStampCell />
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </section>
  );
}
