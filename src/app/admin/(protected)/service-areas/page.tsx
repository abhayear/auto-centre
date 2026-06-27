"use client";

import { ServiceArea } from "@prisma/client";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { MapPin, Pencil, Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ServiceAreaForm } from "@/components/forms/ServiceAreaForm";
import { ServiceCentreSettingsForm } from "@/components/forms/ServiceCentreSettingsForm";

export default function AdminServiceAreasPage() {
  const [areas, setAreas] = useState<ServiceArea[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingArea, setEditingArea] = useState<ServiceArea | undefined>();

  useEffect(() => {
    let active = true;

    async function load() {
      const res = await fetch("/api/service-areas?all=true");
      const data = await res.json();
      if (active) {
        setAreas(Array.isArray(data) ? data : []);
        setLoading(false);
      }
    }

    load();
    return () => {
      active = false;
    };
  }, []);

  async function refreshAreas() {
    const res = await fetch("/api/service-areas?all=true");
    setAreas(await res.json());
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this service area?")) return;

    const res = await fetch(`/api/service-areas?id=${id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Service area deleted");
      refreshAreas();
    } else {
      toast.error("Failed to delete service area");
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
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Service Areas</h1>
          <p className="mt-1 text-sm text-slate-400">
            Set a service radius from your centre, or add named localities for manual lookups.
          </p>
        </div>
        <Button
          onClick={() => {
            setEditingArea(undefined);
            setShowForm(true);
          }}
        >
          <Plus className="h-4 w-4" />
          Add Area
        </Button>
      </div>

      <ServiceCentreSettingsForm />

      <h2 className="mb-4 text-lg font-semibold text-white">Named service areas</h2>
      <div className="overflow-x-auto rounded-xl border border-slate-700/50">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-700 bg-slate-800/50">
            <tr>
              <th className="px-4 py-3 font-medium text-slate-300">Area</th>
              <th className="px-4 py-3 font-medium text-slate-300">Pin Code</th>
              <th className="px-4 py-3 font-medium text-slate-300">Status</th>
              <th className="px-4 py-3 font-medium text-slate-300">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700/50">
            {areas.map((area) => (
              <tr key={area.id} className="hover:bg-slate-800/30">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2 text-white">
                    <MapPin className="h-4 w-4 text-red-500" />
                    {area.name}
                  </div>
                </td>
                <td className="px-4 py-3 text-slate-300">{area.pinCode ?? "—"}</td>
                <td className="px-4 py-3">
                  <Badge variant={area.active ? "success" : "default"}>
                    {area.active ? "Active" : "Inactive"}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setEditingArea(area);
                        setShowForm(true);
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(area.id)}
                    >
                      <Trash2 className="h-4 w-4 text-red-400" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {areas.length === 0 && (
          <p className="py-8 text-center text-slate-400">
            No service areas yet. Add localities you cover around Lalitpur.
          </p>
        )}
      </div>

      {showForm && (
        <ServiceAreaForm
          area={editingArea}
          onSuccess={() => {
            setShowForm(false);
            setEditingArea(undefined);
            refreshAreas();
          }}
          onCancel={() => {
            setShowForm(false);
            setEditingArea(undefined);
          }}
        />
      )}
    </div>
  );
}
