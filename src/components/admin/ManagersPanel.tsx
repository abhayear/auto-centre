"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Plus, Shield, Trash2, UserCog } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";

type Manager = {
  id: string;
  email: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export function ManagersPanel() {
  const [managers, setManagers] = useState<Manager[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    let active = true;

    async function load() {
      const res = await fetch("/api/admin/managers");
      if (!active) return;
      if (res.status === 403) {
        toast.error("Only admins can manage staff");
        setLoading(false);
        return;
      }
      const data = await res.json();
      if (active) {
        setManagers(Array.isArray(data) ? data : []);
        setLoading(false);
      }
    }

    load();
    return () => {
      active = false;
    };
  }, []);

  async function loadManagers() {
    const res = await fetch("/api/admin/managers");
    if (res.status === 403) {
      toast.error("Only admins can manage staff");
      return;
    }
    const data = await res.json();
    setManagers(Array.isArray(data) ? data : []);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setErrors({});

    const res = await fetch("/api/admin/managers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    setSaving(false);

    if (!res.ok) {
      if (Array.isArray(data.details)) {
        const fieldErrors: Record<string, string> = {};
        for (const item of data.details) {
          if (item.field) fieldErrors[item.field] = item.message;
        }
        setErrors(fieldErrors);
      }
      toast.error(data.error ?? "Failed to appoint manager");
      return;
    }

    toast.success("Manager appointed");
    setShowForm(false);
    setEmail("");
    setPassword("");
    loadManagers();
  }

  async function toggleActive(manager: Manager) {
    const res = await fetch("/api/admin/managers", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: manager.id, active: !manager.active }),
    });
    if (res.ok) {
      toast.success(manager.active ? "Manager deactivated" : "Manager activated");
      loadManagers();
    } else {
      toast.error("Failed to update manager");
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Remove this manager? They will no longer be able to log in.")) return;

    const res = await fetch(`/api/admin/managers?id=${id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Manager removed");
      loadManagers();
    } else {
      toast.error("Failed to remove manager");
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
          <h1 className="text-2xl font-bold text-white">Managers</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-400">
            Appoint managers to update website content — vehicles, services, site settings,
            bookings, and more. Managers cannot appoint other staff.
          </p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4" />
          Appoint Manager
        </Button>
      </div>

      <div className="mb-6 rounded-xl border border-slate-700/50 bg-slate-800/30 p-4 text-sm text-slate-300">
        <div className="flex items-start gap-3">
          <Shield className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
          <div>
            <p className="font-medium text-white">Manager access</p>
            <p className="mt-1 text-slate-400">
              Managers use the same admin login page. They can edit all public website content but
              cannot access this Managers page or remove the main admin account.
            </p>
          </div>
        </div>
      </div>

      {managers.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-700 py-16 text-center">
          <UserCog className="mx-auto mb-4 h-12 w-12 text-slate-600" />
          <p className="text-slate-400">No managers appointed yet.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-700/50">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-900/80 text-slate-400">
              <tr>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Appointed</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 bg-slate-900/40">
              {managers.map((manager) => (
                <tr key={manager.id}>
                  <td className="px-4 py-3 text-white">{manager.email}</td>
                  <td className="px-4 py-3">
                    <Badge variant={manager.active ? "success" : "default"}>
                      {manager.active ? "Active" : "Inactive"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-slate-400">
                    {new Date(manager.createdAt).toLocaleDateString("en-IN")}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleActive(manager)}
                      >
                        {manager.active ? "Deactivate" : "Activate"}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(manager.id)}
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

      <Modal open={showForm} onClose={() => setShowForm(false)} title="Appoint Manager">
        <form onSubmit={handleCreate} className="space-y-4">
          <Input
            id="manager-email"
            name="email"
            type="email"
            label="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            error={errors.email}
          />
          <Input
            id="manager-password"
            name="password"
            type="password"
            label="Temporary password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            error={errors.password}
          />
          <p className="text-xs text-slate-500">
            Share these credentials with the manager. They can change their password under Change
            Password after logging in.
          </p>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setShowForm(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : "Appoint Manager"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
