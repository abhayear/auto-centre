"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import toast from "react-hot-toast";
import { ClipboardList, Plus } from "lucide-react";
import {
  canAssignWork,
  type StaffRole,
} from "@/lib/admin-roles";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";

const WORK_STATUSES = ["open", "in_progress", "done"] as const;
type WorkStatus = (typeof WORK_STATUSES)[number];

type WorkItem = {
  id: string;
  title: string;
  notes: string;
  status: WorkStatus;
  githubPrUrl: string | null;
  previewUrl: string | null;
  assigneeId: string | null;
  createdById: string;
  createdAt: string;
  updatedAt: string;
};

type Assignee = {
  id: string;
  email: string;
  role: StaffRole;
};

const statusLabels: Record<WorkStatus, string> = {
  open: "Open",
  in_progress: "In progress",
  done: "Done",
};

const statusOptions = WORK_STATUSES.map((status) => ({
  value: status,
  label: statusLabels[status],
}));

function statusVariant(status: WorkStatus) {
  if (status === "done") return "success" as const;
  if (status === "in_progress") return "info" as const;
  return "warning" as const;
}

function roleLabel(role: StaffRole) {
  return role.replaceAll("_", " ");
}

export function WorkBoard() {
  const { data: session, status: sessionStatus } = useSession();
  const role = session?.user?.role;
  const isAssigner = role ? canAssignWork(role) : false;
  const isJunior = role === "junior_developer";

  const [items, setItems] = useState<WorkItem[]>([]);
  const [assignees, setAssignees] = useState<Assignee[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [assigneeId, setAssigneeId] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (sessionStatus === "loading") return;

    let active = true;

    async function load() {
      try {
        const workRequest = fetch("/api/work");
        const assigneesRequest = isAssigner
          ? fetch("/api/work/assignees")
          : Promise.resolve(null);
        const [workResponse, assigneesResponse] = await Promise.all([
          workRequest,
          assigneesRequest,
        ]);
        const workData = await workResponse.json();

        if (!active) return;
        if (!workResponse.ok) {
          toast.error(workData.error ?? "Failed to load work");
          setItems([]);
        } else {
          setItems(Array.isArray(workData) ? workData : []);
        }

        if (assigneesResponse) {
          const assigneesData = await assigneesResponse.json();
          if (!active) return;
          if (!assigneesResponse.ok) {
            toast.error(assigneesData.error ?? "Failed to load assignees");
            setAssignees([]);
          } else {
            setAssignees(Array.isArray(assigneesData) ? assigneesData : []);
          }
        }
      } catch {
        if (active) toast.error("Failed to load work");
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    return () => {
      active = false;
    };
  }, [isAssigner, sessionStatus]);

  function closeForm() {
    setShowForm(false);
    setTitle("");
    setNotes("");
    setAssigneeId("");
    setErrors({});
  }

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setErrors({});

    try {
      const response = await fetch("/api/work", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          notes,
          assigneeId: assigneeId || null,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        if (Array.isArray(data.details)) {
          const fieldErrors: Record<string, string> = {};
          for (const detail of data.details) {
            if (detail.field) fieldErrors[detail.field] = detail.message;
          }
          setErrors(fieldErrors);
        }
        toast.error(data.error ?? "Failed to create work");
        return;
      }

      setItems((current) => [data, ...current]);
      toast.success("Work assigned");
      closeForm();
    } catch {
      toast.error("Failed to create work");
    } finally {
      setSaving(false);
    }
  }

  async function patchItem(
    id: string,
    patch: { status: WorkStatus } | { assigneeId: string | null },
  ) {
    setUpdatingId(id);
    try {
      const response = await fetch("/api/work", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...patch }),
      });
      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error ?? "Failed to update work");
        return;
      }

      setItems((current) =>
        current.map((item) => (item.id === id ? data : item)),
      );
      toast.success("Work updated");
    } catch {
      toast.error("Failed to update work");
    } finally {
      setUpdatingId(null);
    }
  }

  const assigneeOptions = [
    { value: "", label: "Unassigned" },
    ...assignees.map((assignee) => ({
      value: assignee.id,
      label: `${assignee.email} · ${roleLabel(assignee.role)}`,
    })),
  ];

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Work</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-400">
            {isAssigner
              ? "Assign staff work and track each ticket through completion."
              : isJunior
                ? "Your assigned work. Keep each ticket status up to date."
                : "Work tickets for staff."}
          </p>
        </div>
        {isAssigner ? (
          <Button onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4" />
            Assign Work
          </Button>
        ) : null}
      </div>

      {loading || sessionStatus === "loading" ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-red-500 border-t-transparent" />
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-700 py-16 text-center">
          <ClipboardList className="mx-auto mb-4 h-12 w-12 text-slate-600" />
          <p className="text-slate-400">
            {isJunior ? "No work is assigned to you." : "No work tickets yet."}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((item) => {
            const assignee = assignees.find(
              (candidate) => candidate.id === item.assigneeId,
            );
            const isUpdating = updatingId === item.id;

            return (
              <article
                key={item.id}
                className="rounded-xl border border-slate-700/50 bg-slate-900/40 p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-semibold text-white">{item.title}</h2>
                      <Badge variant={statusVariant(item.status)}>
                        {statusLabels[item.status]}
                      </Badge>
                    </div>
                    <p className="mt-2 whitespace-pre-wrap text-sm text-slate-300">
                      {item.notes || "No notes provided."}
                    </p>
                  </div>
                  <span className="text-xs text-slate-500">
                    {new Date(item.createdAt).toLocaleDateString("en-IN")}
                  </span>
                </div>

                <div className="mt-5 grid gap-4 border-t border-slate-800 pt-4 sm:grid-cols-2">
                  <Select
                    label="Status"
                    value={item.status}
                    options={statusOptions}
                    disabled={isUpdating}
                    onChange={(event) =>
                      patchItem(item.id, {
                        status: event.target.value as WorkStatus,
                      })
                    }
                  />
                  {isAssigner ? (
                    <Select
                      label="Assignee"
                      value={item.assigneeId ?? ""}
                      options={assigneeOptions}
                      disabled={isUpdating}
                      onChange={(event) =>
                        patchItem(item.id, {
                          assigneeId: event.target.value || null,
                        })
                      }
                    />
                  ) : (
                    <div>
                      <p className="text-sm font-medium text-slate-300">Assignee</p>
                      <p className="mt-2 text-sm text-slate-400">
                        {session?.user?.email ?? "You"}
                      </p>
                    </div>
                  )}
                </div>
                {isAssigner ? (
                  <p className="mt-3 text-xs text-slate-500">
                    {assignee
                      ? `Assigned to ${assignee.email}`
                      : "Currently unassigned"}
                  </p>
                ) : null}
              </article>
            );
          })}
        </div>
      )}

      <Modal
        open={showForm}
        onClose={closeForm}
        title="Assign Work"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <Input
            id="work-title"
            name="title"
            label="Title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            required
            error={errors.title}
          />
          <Textarea
            id="work-notes"
            name="notes"
            label="Notes"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            rows={5}
            error={errors.notes}
          />
          <Select
            id="work-assignee"
            name="assigneeId"
            label="Assignee"
            value={assigneeId}
            onChange={(event) => setAssigneeId(event.target.value)}
            options={assigneeOptions}
            error={errors.assigneeId}
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={closeForm}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Assigning…" : "Assign Work"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
