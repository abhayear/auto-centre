import { MechanicReferralForm } from "@/components/mechanic-referral/MechanicReferralForm";
import { MECHANIC_REFERRAL_LABOUR_OFF_RUPEES, MECHANIC_REFERRAL_STAY_DAYS } from "@/lib/mechanic-referral";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Refer a mechanic",
  description: `Refer a mechanic and get ₹${MECHANIC_REFERRAL_LABOUR_OFF_RUPEES} off your next labour bill after they join and stay ${MECHANIC_REFERRAL_STAY_DAYS} days.`,
};

export default function ReferMechanicPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold text-white">Refer a mechanic</h1>
      <p className="mt-2 text-slate-400">
        If we hire the mechanic you refer and they work {MECHANIC_REFERRAL_STAY_DAYS} days, you get
        ₹{MECHANIC_REFERRAL_LABOUR_OFF_RUPEES} off your next labour bill.
      </p>
      <p className="mt-2 text-sm text-slate-500">
        Send their name, contact number, address, years of expertise, and skills: electrical,
        petrol, battery, motor, controller, or charger repair.
      </p>
      <div className="mt-8">
        <MechanicReferralForm />
      </div>
    </div>
  );
}
