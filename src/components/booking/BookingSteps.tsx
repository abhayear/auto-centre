"use client";

import Link from "next/link";
import { CheckCircle2 } from "lucide-react";

export function BookingSteps({ current }: { current: 1 | 2 | 3 }) {
  const steps = [
    { num: 1, label: "Book Online" },
    { num: 2, label: "Payment" },
    { num: 3, label: "Confirmation" },
  ] as const;

  return (
    <ol className="mb-8 flex items-center justify-center gap-2 sm:gap-4">
      {steps.map((step) => {
        const done = step.num < current;
        const active = step.num === current;

        return (
          <li key={step.num} className="flex items-center gap-2 sm:gap-4">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold ${
                done
                  ? "bg-green-600 text-white"
                  : active
                    ? "bg-red-600 text-white"
                    : "bg-slate-700 text-slate-400"
              }`}
            >
              {done ? <CheckCircle2 className="h-4 w-4" /> : step.num}
            </div>
            <span
              className={`hidden text-sm sm:inline ${
                active ? "font-medium text-white" : "text-slate-400"
              }`}
            >
              {step.label}
            </span>
            {step.num < 3 && <span className="hidden h-px w-8 bg-slate-700 sm:block" />}
          </li>
        );
      })}
    </ol>
  );
}

export function BookingStepNav({
  backHref,
  backLabel,
}: {
  backHref?: string;
  backLabel?: string;
}) {
  if (!backHref) return null;

  return (
    <p className="mt-6 text-center text-sm text-slate-400">
      <Link href={backHref} className="text-red-400 hover:text-red-300">
        ← {backLabel ?? "Back"}
      </Link>
    </p>
  );
}
