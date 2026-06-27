"use client";

import { Vehicle } from "@prisma/client";
import { VehicleCard } from "./VehicleCard";

export function VehicleGrid({ vehicles }: { vehicles: Vehicle[] }) {
  if (vehicles.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-700 py-16 text-center">
        <p className="text-lg text-slate-400">No e-scooters match your filters.</p>
        <p className="mt-1 text-sm text-slate-500">Try adjusting your search criteria.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {vehicles.map((vehicle) => (
        <VehicleCard key={vehicle.id} vehicle={vehicle} />
      ))}
    </div>
  );
}
