"use client";

import { Vehicle } from "@prisma/client";
import { useMemo, useState } from "react";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { VehicleGrid } from "./VehicleGrid";

interface VehicleFiltersProps {
  vehicles: Vehicle[];
}

export function VehicleFilters({ vehicles }: VehicleFiltersProps) {
  const [make, setMake] = useState("");
  const [condition, setCondition] = useState("");
  const [fuelType, setFuelType] = useState("");
  const [maxPrice, setMaxPrice] = useState("");

  const makes = useMemo(
    () => [...new Set(vehicles.map((v) => v.make))].sort(),
    [vehicles]
  );

  const filtered = useMemo(() => {
    return vehicles.filter((v) => {
      if (make && v.make !== make) return false;
      if (condition && v.condition !== condition) return false;
      if (fuelType && v.fuelType !== fuelType) return false;
      if (maxPrice && v.price > Number(maxPrice)) return false;
      return v.status === "available";
    });
  }, [vehicles, make, condition, fuelType, maxPrice]);

  return (
    <div>
      <div className="mb-8 grid gap-4 rounded-xl border border-slate-700/50 bg-slate-800/30 p-4 sm:grid-cols-2 lg:grid-cols-4">
        <Select
          label="Make"
          value={make}
          onChange={(e) => setMake(e.target.value)}
          options={makes.map((m) => ({ value: m, label: m }))}
          placeholder="All Makes"
        />
        <Select
          label="Condition"
          value={condition}
          onChange={(e) => setCondition(e.target.value)}
          options={[
            { value: "new", label: "New" },
            { value: "used", label: "Used" },
          ]}
          placeholder="All Conditions"
        />
        <Select
          label="Fuel Type"
          value={fuelType}
          onChange={(e) => setFuelType(e.target.value)}
          options={[
            { value: "Petrol", label: "Petrol" },
            { value: "Diesel", label: "Diesel" },
            { value: "Electric", label: "Electric" },
            { value: "Hybrid", label: "Hybrid" },
            { value: "Plug-in Hybrid", label: "Plug-in Hybrid" },
          ]}
          placeholder="All Fuel Types"
        />
        <Input
          label="Max Price"
          type="number"
          placeholder="e.g. 50000"
          value={maxPrice}
          onChange={(e) => setMaxPrice(e.target.value)}
        />
      </div>

      <p className="mb-4 text-sm text-slate-400">
        Showing {filtered.length} of {vehicles.length} vehicles
      </p>

      <VehicleGrid vehicles={filtered} />
    </div>
  );
}
