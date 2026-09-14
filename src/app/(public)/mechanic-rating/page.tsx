import Link from "next/link";
import { MechanicBonusForm } from "@/components/mechanic-bonus/MechanicBonusForm";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Rate your mechanic",
  description: "Enter your bill number and rate the three workshop mechanics.",
};

export default function MechanicRatingPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold text-white">Rate your mechanic</h1>
      <p className="mt-2 text-slate-400">
        Please enter the job / bill number and score each mechanic from 1 to 5. This helps the
        manager decide workshop bonus.
      </p>
      <div className="mt-8">
        <MechanicBonusForm />
      </div>
      <div className="mt-12 border-t border-slate-800 pt-8">
        <h2 className="text-xl font-semibold text-white">Refer a mechanic</h2>
        <p className="mt-2 text-sm text-slate-400">
          Know a mechanic for electrical, petrol, battery, motor, controller, or charger repair?
          Send their name, contact number, address, and years of expertise.
        </p>
        <Link
          href="/refer-mechanic"
          className="mt-4 inline-flex rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700"
        >
          Refer a mechanic
        </Link>
      </div>
    </div>
  );
}

