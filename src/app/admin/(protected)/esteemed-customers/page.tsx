"use client";

import { EsteemedCustomer } from "@prisma/client";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Pencil, Plus, Star, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EsteemedCustomerForm } from "@/components/forms/EsteemedCustomerForm";

export default function AdminEsteemedCustomersPage() {
  const [customers, setCustomers] = useState<EsteemedCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<EsteemedCustomer | undefined>();

  useEffect(() => {
    let active = true;

    async function load() {
      const res = await fetch("/api/esteemed-customers?all=true");
      const data = await res.json();
      if (active) {
        setCustomers(Array.isArray(data) ? data : []);
        setLoading(false);
      }
    }

    load();
    return () => {
      active = false;
    };
  }, []);

  async function refreshCustomers() {
    const res = await fetch("/api/esteemed-customers?all=true");
    setCustomers(await res.json());
  }

  async function handleDelete(id: string) {
    if (!confirm("Remove this esteemed customer from the list?")) return;

    const res = await fetch(`/api/esteemed-customers?id=${id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Customer removed");
      refreshCustomers();
    } else {
      toast.error("Failed to remove customer");
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
          <h1 className="text-2xl font-bold text-white">Esteemed Customers</h1>
          <p className="mt-1 text-sm text-slate-400">
            Manage the customer list shown on the home and about pages.
          </p>
        </div>
        <Button
          onClick={() => {
            setEditingCustomer(undefined);
            setShowForm(true);
          }}
        >
          <Plus className="h-4 w-4" />
          Add Customer
        </Button>
      </div>

      {customers.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-700/50 bg-slate-800/20 p-10 text-center">
          <Star className="mx-auto mb-3 h-8 w-8 text-slate-500" />
          <p className="text-slate-400">No esteemed customers yet. Add your first one.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-700/50">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-800/80 text-slate-300">
              <tr>
                <th className="px-4 py-3 font-medium">Order</th>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Details</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {customers.map((customer) => (
                <tr key={customer.id} className="text-slate-300">
                  <td className="px-4 py-3">{customer.sortOrder}</td>
                  <td className="px-4 py-3 font-medium text-white">{customer.name}</td>
                  <td className="px-4 py-3">
                    <div className="space-y-1">
                      {customer.designation && <p>{customer.designation}</p>}
                      {customer.locality && (
                        <p className="text-slate-400">{customer.locality}</p>
                      )}
                      {customer.vehicle && (
                        <p className="text-slate-400">{customer.vehicle}</p>
                      )}
                      {customer.note && (
                        <p className="text-xs text-slate-500">{customer.note}</p>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={customer.active ? "success" : "default"}>
                      {customer.active ? "Active" : "Hidden"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditingCustomer(customer);
                          setShowForm(true);
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-400 hover:text-red-300"
                        onClick={() => void handleDelete(customer.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <EsteemedCustomerForm
          customer={editingCustomer}
          onSuccess={() => {
            setShowForm(false);
            setEditingCustomer(undefined);
            refreshCustomers();
          }}
          onCancel={() => {
            setShowForm(false);
            setEditingCustomer(undefined);
          }}
        />
      )}
    </div>
  );
}
