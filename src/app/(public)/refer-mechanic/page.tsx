import { MechanicReferralForm } from "@/components/mechanic-referral/MechanicReferralForm";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Refer a mechanic",
  description:
    "Refer a mechanic with name, contact number, address, years of expertise, and repair skills.",
};

export default function ReferMechanicPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold text-white">Refer a mechanic</h1>
      <p className="mt-2 text-slate-400">
        Send complete details: name, contact number, address, years of expertise, and whether they
        work on electrical, petrol, battery, motor, controller, or charger repair.
      </p>
      <div className="mt-8">
        <MechanicReferralForm />
      </div>
    </div>
  );
}
