import { ServiceScheduleForm } from "@/components/forms/ServiceScheduleForm";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Service Schedule",
};

export default function AdminServiceSchedulePage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Service Schedule</h1>
        <p className="mt-1 text-sm text-slate-400">
          Edit the low-speed electric bike maintenance guide shown to customers — especially when
          odometer readings reset often.
        </p>
      </div>

      <ServiceScheduleForm />
    </div>
  );
}
