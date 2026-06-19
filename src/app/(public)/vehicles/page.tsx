import { VehicleFilters } from "@/components/vehicles/VehicleFilters";
import { prisma } from "@/lib/prisma";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Vehicles",
  description: "Browse our inventory of new and pre-owned vehicles.",
};

export default async function VehiclesPage() {
  const vehicles = await prisma.vehicle.findMany({
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Vehicle Inventory</h1>
        <p className="mt-2 text-slate-400">
          Find your perfect vehicle from our curated selection.
        </p>
      </div>
      <VehicleFilters vehicles={vehicles} />
    </div>
  );
}
