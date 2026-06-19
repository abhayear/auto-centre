"use client";

import { Service } from "@prisma/client";
import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ServiceForm } from "@/components/forms/ServiceForm";
import { formatPrice } from "@/lib/utils";

export default function AdminServicesPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingService, setEditingService] = useState<Service | undefined>();

  const fetchServices = useCallback(async () => {
    const res = await fetch("/api/services?all=true");
    const data = await res.json();
    setServices(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchServices();
  }, [fetchServices]);

  async function handleDelete(id: string) {
    if (!confirm("Delete this service?")) return;

    const res = await fetch(`/api/services?id=${id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Service deleted");
      fetchServices();
    } else {
      toast.error("Failed to delete service");
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
        <h1 className="text-2xl font-bold text-white">Services</h1>
        <Button
          onClick={() => {
            setEditingService(undefined);
            setShowForm(true);
          }}
        >
          <Plus className="h-4 w-4" />
          Add Service
        </Button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-700/50">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-700 bg-slate-800/50">
            <tr>
              <th className="px-4 py-3 font-medium text-slate-300">Name</th>
              <th className="px-4 py-3 font-medium text-slate-300">Price</th>
              <th className="px-4 py-3 font-medium text-slate-300">Duration</th>
              <th className="px-4 py-3 font-medium text-slate-300">Status</th>
              <th className="px-4 py-3 font-medium text-slate-300">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700/50">
            {services.map((service) => (
              <tr key={service.id} className="hover:bg-slate-800/30">
                <td className="px-4 py-3 text-white">{service.name}</td>
                <td className="px-4 py-3 text-slate-300">
                  {formatPrice(service.estimatedPrice)}
                </td>
                <td className="px-4 py-3 text-slate-300">
                  {service.durationMinutes} min
                </td>
                <td className="px-4 py-3">
                  <Badge variant={service.active ? "success" : "default"}>
                    {service.active ? "Active" : "Inactive"}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setEditingService(service);
                        setShowForm(true);
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(service.id)}
                    >
                      <Trash2 className="h-4 w-4 text-red-400" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {services.length === 0 && (
          <p className="py-8 text-center text-slate-400">No services yet.</p>
        )}
      </div>

      {showForm && (
        <ServiceForm
          service={editingService}
          onSuccess={() => {
            setShowForm(false);
            setEditingService(undefined);
            fetchServices();
          }}
          onCancel={() => {
            setShowForm(false);
            setEditingService(undefined);
          }}
        />
      )}
    </div>
  );
}
