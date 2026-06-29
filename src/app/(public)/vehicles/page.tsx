import { VehicleFilters } from "@/components/vehicles/VehicleFilters";
import { prisma } from "@/lib/prisma";
import { safeDbQuery } from "@/lib/safe-db";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "E-Scooters",
  description: "Browse electric 2-wheelers — new and pre-owned e-scooters at Auto Galaxy, Lalitpur.",
};

export default async function VehiclesPage() {
  const vehicles = await safeDbQuery(
    () => prisma.vehicle.findMany({ orderBy: { createdAt: "desc" } }),
    []
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">E-Scooter Inventory</h1>
        <p className="mt-2 text-slate-400">
          Find your perfect electric 2-wheeler from our curated selection.
        </p>
      </div>
      <VehicleFilters vehicles={vehicles} />
    </div>
  );
}
