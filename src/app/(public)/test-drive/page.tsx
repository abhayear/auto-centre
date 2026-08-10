import { OnlineBookingForm } from "@/components/forms/OnlineBookingForm";
import { prisma } from "@/lib/prisma";
import { safeDbQuery } from "@/lib/safe-db";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Book Online",
  description: "Book an electric scooter online and get a cash refund from Auto Galaxy.",
};

type PageProps = {
  searchParams: Promise<{ vehicleId?: string }>;
};

export default async function TestDrivePage({ searchParams }: PageProps) {
  const { vehicleId } = await searchParams;

  const vehicles = await safeDbQuery(
    () =>
      prisma.vehicle.findMany({
        where: {
          status: "available",
          fuelType: "Electric",
        },
        orderBy: [{ featured: "desc" }, { createdAt: "desc" }],
      }),
    [],
  );

  const bookableVehicles = vehicles.map((vehicle) => ({
    id: vehicle.id,
    label: `${vehicle.year} ${vehicle.make} ${vehicle.model}`,
    onlineBookingRefund: vehicle.onlineBookingRefund,
  }));

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Book E-Scooter Online</h1>
        <p className="mt-2 text-slate-400">
          Choose a model uploaded by our team, submit your booking, and receive the cash refund
          amount set for that e-scooter.
        </p>
      </div>

      <div className="rounded-xl border border-slate-700/50 bg-slate-800/30 p-6">
        <OnlineBookingForm
          vehicles={bookableVehicles}
          initialVehicleId={vehicleId}
        />
      </div>
    </div>
  );
}
