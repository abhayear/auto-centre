"use client";

import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { Plus, Shield, Trash2, UserCog } from "lucide-react";
import {
  STAFF_ROLES,
  type StaffRole,
} from "@/lib/admin-roles";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";

type StaffMember = {
  id: string;
  email: string;
  role: StaffRole;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

const roleLabels: Record<StaffRole, string> = {
  admin: "Admin",
  manager: "Manager",
  senior_developer: "Senior developer",
  junior_developer: "Junior developer",
  sales: "Sales",
  mechanic: "Mechanic",
};

type Props = {
  defaultRoleFilter?: string;
};

export function StaffPanel({ defaultRoleFilter }: Props) {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<StaffRole>("manager");
  const [roleFilter, setRoleFilter] = useState<string>(defaultRoleFilter ?? "all");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const filteredStaff = useMemo(() => {
    if (roleFilter === "all") return staff;
    return staff.filter((member) => member.role === roleFilter);
  }, [staff, roleFilter]);

  useEffect(() => {
    let active = true;

    async function load() {
      const res = await fetch("/api/admin/staff");
      if (!active) return;
      if (res.status === 403) {
        toast.error("Only admins can manage staff");
        setLoading(false);
        return;
      }
      const data = await res.json();
      if (active) {
        setStaff(Array.isArray(data) ? data : []);
        setLoading(false);
      }
    }

    load();
    return () => {
      active = false;
    };
  }, []);

  async function loadStaff() {
    const res = await fetch("/api/admin/staff");
    if (res.status === 403) {
      toast.error("Only admins can manage staff");
      return;
    }
    const data = await res.json();
    setStaff(Array.isArray(data) ? data : []);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setErrors({});

    const res = await fetch("/api/admin/staff", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, role }),
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
      toast.error(data.error ?? "Failed to appoint staff member");
      return;
    }

    toast.success(`${roleLabels[role]} appointed`);
    setShowForm(false);
    setEmail("");
    setPassword("");
    setRole("manager");
    loadStaff();
  }

  async function toggleActive(member: StaffMember) {
    const res = await fetch("/api/admin/staff", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: member.id, active: !member.active }),
    });
    const data = await res.json();
    if (res.ok) {
      toast.success(member.active ? "Staff member deactivated" : "Staff member activated");
      loadStaff();
    } else {
      toast.error(data.error ?? "Failed to update staff member");
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Remove this staff member? They will no longer be able to log in.")) return;

    const res = await fetch(`/api/admin/staff?id=${id}`, { method: "DELETE" });
    const data = await res.json();
    if (res.ok) {
      toast.success("Staff member removed");
      loadStaff();
    } else {
      toast.error(data.error ?? "Failed to remove staff member");
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
          <h1 className="text-2xl font-bold text-white">Staff</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-400">
            Appoint staff for all portal roles — admin, manager, developers, sales, and
            mechanic. Only admins can access this page.
          </p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4" />
          Appoint Staff
        </Button>
      </div>

      <div className="mb-6 rounded-xl border border-slate-700/50 bg-slate-800/30 p-4 text-sm text-slate-300">
        <div className="flex items-start gap-3">
          <Shield className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
          <div>
            <p className="font-medium text-white">Staff access</p>
            <p className="mt-1 text-slate-400">
              Each role signs in via the staff portal and sees only the tools allowed for
              their role. The last remaining admin cannot be removed or deactivated.
            </p>
          </div>
        </div>
      </div>

      <div className="mb-4">
        <label htmlFor="staff-role-filter" className="mb-1 block text-sm font-medium text-slate-300">
          Filter by role
        </label>
        <select
          id="staff-role-filter"
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
        >
          <option value="all">All roles</option>
          {STAFF_ROLES.map((staffRole) => (
            <option key={staffRole} value={staffRole}>
              {roleLabels[staffRole]}
            </option>
          ))}
        </select>
      </div>

      {filteredStaff.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-700 py-16 text-center">
          <UserCog className="mx-auto mb-4 h-12 w-12 text-slate-600" />
          <p className="text-slate-400">No staff members found.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-700/50">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-900/80 text-slate-400">
              <tr>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Role</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Appointed</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 bg-slate-900/40">
              {filteredStaff.map((member) => (
                <tr key={member.id}>
                  <td className="px-4 py-3 text-white">{member.email}</td>
                  <td className="px-4 py-3 text-slate-300">{roleLabels[member.role]}</td>
                  <td className="px-4 py-3">
                    <Badge variant={member.active ? "success" : "default"}>
                      {member.active ? "Active" : "Inactive"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-slate-400">
                    {new Date(member.createdAt).toLocaleDateString("en-IN")}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" onClick={() => toggleActive(member)}>
                        {member.active ? "Deactivate" : "Activate"}
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(member.id)}>
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

      <Modal open={showForm} onClose={() => setShowForm(false)} title="Appoint Staff">
        <form onSubmit={handleCreate} className="space-y-4">
          <Input
            id="staff-email"
            name="email"
            type="email"
            label="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            error={errors.email}
          />
          <Input
            id="staff-password"
            name="password"
            type="password"
            label="Temporary password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            error={errors.password}
          />
          <div>
            <label htmlFor="staff-role" className="mb-1 block text-sm font-medium text-slate-300">
              Role
            </label>
            <select
              id="staff-role"
              name="role"
              value={role}
              onChange={(e) => setRole(e.target.value as StaffRole)}
              className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
            >
              {STAFF_ROLES.map((staffRole) => (
                <option key={staffRole} value={staffRole}>
                  {roleLabels[staffRole]}
                </option>
              ))}
            </select>
            {errors.role ? <p className="mt-1 text-xs text-red-400">{errors.role}</p> : null}
          </div>
          <p className="text-xs text-slate-500">
            Share these credentials with the staff member. They can change their password under
            Change Password after logging in.
          </p>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setShowForm(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : "Appoint Staff"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
