"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
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
  isOemScheduleComplete,
} from "@/lib/electric-scooter-service-schedule";

const statusStyles: Record<string, string> = {
  overdue: "border-red-500/50 bg-red-950/30 text-red-300",
  "due-soon": "border-amber-500/50 bg-amber-950/20 text-amber-200",
  upcoming: "border-slate-700 bg-slate-900/40 text-slate-300",
  completed: "border-emerald-700/40 bg-emerald-950/20 text-emerald-300",
};

export function ServiceDueCalculator() {
  const [deliveryDate, setDeliveryDate] = useState("");
  const [lastCompleted, setLastCompleted] = useState("");

  const milestones = useMemo(() => {
    if (!deliveryDate) return null;
    const parsed = new Date(`${deliveryDate}T00:00:00.000Z`);
    if (Number.isNaN(parsed.getTime())) return null;
    return getMilestoneDueDates(
      parsed,
      new Date(),
      lastCompleted || undefined,
    );
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
    <section className="mb-10 rounded-xl border border-red-600/30 bg-slate-900/50 p-6">
      <div className="mb-4 flex items-center gap-2 text-red-400">
        <CalendarClock className="h-5 w-5" />
        <h2 className="text-lg font-semibold text-white">When is my next service due?</h2>
      </div>
      <p className="mb-4 text-sm text-slate-400">
        Enter your electric scooter delivery date to see free & paid service milestones. Services
        must be done on time to keep warranty valid. After the 9th service (day 1080), annual
        maintenance reminders continue every 365 days.
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          id="deliveryDate"
          type="date"
          label="Delivery / purchase date"
          value={deliveryDate}
          onChange={(e) => setDeliveryDate(e.target.value)}
        />
        <Select
          id="lastCompleted"
          label="Last completed service (optional)"
          value={lastCompleted}
          onChange={(e) => setLastCompleted(e.target.value)}
          options={[
            { value: "", label: "None completed yet" },
            ...ELECTRIC_SCOOTER_MILESTONES.map((m) => ({ value: m.id, label: m.label })),
          ]}
        />
      </div>

      {nextDue ? (
        <div
          className={`mt-5 rounded-lg border p-4 ${statusStyles[nextDue.status] ?? statusStyles.upcoming}`}
        >
          <p className="text-sm font-medium uppercase tracking-wide opacity-80">
            {nextDue.type === "annual" ? "Next annual maintenance" : "Next service due"}
          </p>
          <p className="mt-1 text-xl font-bold text-white">{nextDue.label}</p>
          <p className="mt-1 text-sm">
            Due by <strong>{formatScheduleDate(nextDue.dueDate)}</strong>
            {nextDue.status === "overdue"
              ? ` · ${Math.abs(nextDue.daysUntilDue)} days overdue`
              : nextDue.status === "due-soon"
                ? ` · within ${nextDue.daysUntilDue} days`
                : ` · in ${nextDue.daysUntilDue} days`}
          </p>
          {nextDue.type === "annual" ? (
            <p className="mt-2 text-sm opacity-90">
              OEM warranty schedule ends at 9th PS (day 1080). Book general paid maintenance yearly
              for brakes, tyres, battery health, and safety checks.
            </p>
          ) : null}
          {nextDue.status === "overdue" && nextDue.type !== "annual" ? (
            <p className="mt-2 flex items-center gap-1 text-sm text-red-300">
              <AlertTriangle className="h-4 w-4" />
              Overdue service may affect warranty — book immediately.
            </p>
          ) : null}
          <Link href="/book-service" className="mt-4 inline-block">
            <Button type="button">Book this service</Button>
          </Link>
        </div>
      ) : null}

      {milestones ? (
        <div className="mt-6 overflow-x-auto rounded-lg border border-slate-700/50">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-800/80 text-slate-200">
              <tr>
                <th className="px-3 py-2">Service</th>
                <th className="px-3 py-2">Day</th>
                <th className="px-3 py-2">Due date</th>
                <th className="px-3 py-2">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {milestones.map((m) => (
                <tr key={m.id} className="text-slate-300">
                  <td className="px-3 py-2">
                    {m.shortLabel}
                    <span className="ml-1 text-xs text-slate-500">
                      ({m.type === "free" ? "Free" : "Paid"})
                    </span>
                  </td>
                  <td className="px-3 py-2">{m.days}</td>
                  <td className="px-3 py-2">{formatScheduleDate(m.dueDate)}</td>
                  <td className="px-3 py-2 capitalize">
                    {m.status === "due-soon" ? "Due soon" : m.status}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {oemComplete && annualReminders && annualReminders.length > 0 ? (
        <div className="mt-6">
          <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-400">
            Annual maintenance (after 9th PS)
          </h3>
          <div className="overflow-x-auto rounded-lg border border-slate-700/50">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-800/80 text-slate-200">
                <tr>
                  <th className="px-3 py-2">Service</th>
                  <th className="px-3 py-2">Due date</th>
                  <th className="px-3 py-2">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {annualReminders.map((a) => (
                  <tr key={a.id} className="text-slate-300">
                    <td className="px-3 py-2">
                      {a.shortLabel}
                      <span className="ml-1 text-xs text-slate-500">(Paid)</span>
                    </td>
                    <td className="px-3 py-2">{formatScheduleDate(a.dueDate)}</td>
                    <td className="px-3 py-2 capitalize">
                      {a.status === "due-soon" ? "Due soon" : a.status}
                    </td>
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
