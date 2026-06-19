"use client";

import { Vehicle } from "@prisma/client";
import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Badge, statusBadgeVariant } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { VehicleForm } from "@/components/forms/VehicleForm";
import { formatPrice } from "@/lib/utils";

export default function AdminVehiclesPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | undefined>();

  const fetchVehicles = useCallback(async () => {
    const res = await fetch("/api/vehicles");
    const data = await res.json();
    setVehicles(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchVehicles();
  }, [fetchVehicles]);

  async function handleDelete(id: string) {
    if (!confirm("Delete this vehicle?")) return;

    const res = await fetch(`/api/vehicles/${id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Vehicle deleted");
      fetchVehicles();
    } else {
      toast.error("Failed to delete vehicle");
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-red-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Vehicles</h1>
        <Button
          onClick={() => {
            setEditingVehicle(undefined);
            setShowForm(true);
          }}
        >
          <Plus className="h-4 w-4" />
          Add Vehicle
        </Button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-700/50">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-700 bg-slate-800/50">
            <tr>
              <th className="px-4 py-3 font-medium text-slate-300">Vehicle</th>
              <th className="px-4 py-3 font-medium text-slate-300">Price</th>
              <th className="px-4 py-3 font-medium text-slate-300">Status</th>
              <th className="px-4 py-3 font-medium text-slate-300">Featured</th>
              <th className="px-4 py-3 font-medium text-slate-300">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700/50">
            {vehicles.map((vehicle) => (
              <tr key={vehicle.id} className="hover:bg-slate-800/30">
                <td className="px-4 py-3 text-white">
                  {vehicle.year} {vehicle.make} {vehicle.model}
                </td>
                <td className="px-4 py-3 text-slate-300">
                  {formatPrice(vehicle.price)}
                </td>
                <td className="px-4 py-3">
                  <Badge variant={statusBadgeVariant(vehicle.status)}>
                    {vehicle.status}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-slate-300">
                  {vehicle.featured ? "Yes" : "No"}
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setEditingVehicle(vehicle);
                        setShowForm(true);
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(vehicle.id)}
                    >
                      <Trash2 className="h-4 w-4 text-red-400" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {vehicles.length === 0 && (
          <p className="py-8 text-center text-slate-400">No vehicles yet.</p>
        )}
      </div>

      {showForm && (
        <VehicleForm
          vehicle={editingVehicle}
          onSuccess={() => {
            setShowForm(false);
            setEditingVehicle(undefined);
            fetchVehicles();
          }}
          onCancel={() => {
            setShowForm(false);
            setEditingVehicle(undefined);
          }}
        />
      )}
    </div>
  );
}
