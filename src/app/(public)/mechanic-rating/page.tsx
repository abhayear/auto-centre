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
    </div>
  );
}
