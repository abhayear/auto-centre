import { InquiryForm } from "@/components/forms/InquiryForm";
import { prisma } from "@/lib/prisma";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Test Drive",
  description: "Request a test drive for any vehicle in our inventory.",
};

type PageProps = {
  searchParams: Promise<{ vehicleId?: string }>;
};

export default async function TestDrivePage({ searchParams }: PageProps) {
  const { vehicleId } = await searchParams;

  let vehicleLabel: string | undefined;
  if (vehicleId) {
    const vehicle = await prisma.vehicle.findUnique({ where: { id: vehicleId } });
    if (vehicle) {
      vehicleLabel = `${vehicle.year} ${vehicle.make} ${vehicle.model}`;
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Request a Test Drive</h1>
        <p className="mt-2 text-slate-400">
          Experience the vehicle before you buy. We&apos;ll arrange a convenient time for you.
        </p>
      </div>

      <div className="rounded-xl border border-slate-700/50 bg-slate-800/30 p-6">
        <InquiryForm
          type="test_drive"
          vehicleId={vehicleId}
          vehicleLabel={vehicleLabel}
        />
      </div>
    </div>
  );
}
