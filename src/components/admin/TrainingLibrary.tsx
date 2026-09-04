"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import toast from "react-hot-toast";
import {
  ExternalLink,
  FileText,
  GraduationCap,
  Pencil,
  Plus,
  Trash2,
  Video,
} from "lucide-react";
import {
  canEditTraining,
  type TrainingAudience,
} from "@/lib/admin-roles";
import {
  TRAINING_AUDIENCES,
  TRAINING_KINDS,
} from "@/lib/training-access";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Textarea } from "@/components/ui/Textarea";

type TrainingKind = (typeof TRAINING_KINDS)[number];

type TrainingResource = {
  id: string;
  audience: TrainingAudience;
  kind: TrainingKind;
  title: string;
  summary: string | null;
  body: string;
  linkUrl: string | null;
  fileUrl: string | null;
  published: boolean;
  sortOrder: number;
  updatedByEmail: string;
  createdAt: string;
  updatedAt: string;
};

type FormState = {
  title: string;
  audience: TrainingAudience;
  kind: TrainingKind;
  summary: string;
  body: string;
  linkUrl: string;
  fileUrl: string;
  published: boolean;
  sortOrder: number;
};

const audienceLabels: Record<TrainingAudience, string> = {
  sales: "Sales",
  mechanic: "Mechanic",
  manager: "Manager",
};

const kindLabels: Record<TrainingKind, string> = {
  script: "Script",
  sop: "SOP",
  video: "Video",
  file: "File",
};

const emptyForm: FormState = {
  title: "",
  audience: "sales",
  kind: "script",
  summary: "",
  body: "",
  linkUrl: "",
  fileUrl: "",
  published: false,
  sortOrder: 0,
};

function TrainingResourceContent({ resource }: { resource: TrainingResource }) {
  return (
    <div className="space-y-4">
      {resource.summary ? (
        <p className="text-sm text-slate-300">{resource.summary}</p>
      ) : null}
      <div className="whitespace-pre-wrap text-sm leading-relaxed text-slate-200">
        {resource.body}
      </div>
      {resource.kind === "video" && resource.linkUrl ? (
        <a
          href={resource.linkUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-sm font-medium text-red-400 hover:text-red-300"
        >
          <Video className="h-4 w-4" />
          Watch video
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      ) : null}
      {resource.kind === "file" && resource.fileUrl ? (
        <a
          href={resource.fileUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-sm font-medium text-red-400 hover:text-red-300"
        >
          <FileText className="h-4 w-4" />
          Open file
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      ) : null}
      {resource.linkUrl && resource.kind !== "video" ? (
        <a
          href={resource.linkUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-sm font-medium text-red-400 hover:text-red-300"
        >
          <ExternalLink className="h-4 w-4" />
          Open link
        </a>
      ) : null}
    </div>
  );
}

function resourceToForm(resource: TrainingResource): FormState {
  return {
    title: resource.title,
    audience: resource.audience,
    kind: resource.kind,
    summary: resource.summary ?? "",
    body: resource.body,
    linkUrl: resource.linkUrl ?? "",
    fileUrl: resource.fileUrl ?? "",
    published: resource.published,
    sortOrder: resource.sortOrder,
  };
}

function formPayload(form: FormState) {
  return {
    title: form.title,
    audience: form.audience,
    kind: form.kind,
    summary: form.summary.trim() || null,
    body: form.body,
    linkUrl: form.linkUrl.trim() || null,
    fileUrl: form.fileUrl.trim() || null,
    published: form.published,
    sortOrder: form.sortOrder,
  };
}

export function TrainingLibrary() {
  const { data: session, status: sessionStatus } = useSession();
  const role = session?.user?.role;
  const isEditor = role ? canEditTraining(role) : false;

  const [resources, setResources] = useState<TrainingResource[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [audienceFilter, setAudienceFilter] = useState<string>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filteredResources = useMemo(() => {
    if (audienceFilter === "all") return resources;
    return resources.filter((resource) => resource.audience === audienceFilter);
  }, [resources, audienceFilter]);

  async function loadResources() {
    const res = await fetch("/api/training");
    if (res.status === 403) {
      toast.error("You do not have access to training materials");
      setResources([]);
      setLoading(false);
      return;
    }
    const data = await res.json();
    if (!res.ok) {
      toast.error(data.error ?? "Failed to load training materials");
      setResources([]);
      setLoading(false);
      return;
    }
    setResources(Array.isArray(data) ? data : []);
    setLoading(false);
  }

  useEffect(() => {
    let active = true;

    async function load() {
      const res = await fetch("/api/training");
      if (!active) return;
      if (res.status === 403) {
        toast.error("You do not have access to training materials");
        setLoading(false);
        return;
      }
      const data = await res.json();
      if (active) {
        if (!res.ok) {
          toast.error(data.error ?? "Failed to load training materials");
          setResources([]);
        } else {
          setResources(Array.isArray(data) ? data : []);
        }
        setLoading(false);
      }
    }

    if (sessionStatus !== "loading") {
      load();
    }

    return () => {
      active = false;
    };
  }, [sessionStatus]);

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setErrors({});
    setShowForm(true);
  }

  function openEdit(resource: TrainingResource) {
    setEditingId(resource.id);
    setForm(resourceToForm(resource));
    setErrors({});
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm);
    setErrors({});
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setErrors({});

    const payload = formPayload(form);
    const res = await fetch("/api/training", {
      method: editingId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editingId ? { id: editingId, ...payload } : payload),
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
      toast.error(data.error ?? "Failed to save training resource");
      return;
    }

    toast.success(editingId ? "Training resource updated" : "Training resource created");
    closeForm();
    setLoading(true);
    await loadResources();
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this training resource?")) return;

    const res = await fetch(`/api/training?id=${id}`, { method: "DELETE" });
    const data = await res.json();
    if (res.ok) {
      toast.success("Training resource deleted");
      setLoading(true);
      await loadResources();
    } else {
      toast.error(data.error ?? "Failed to delete training resource");
    }
  }

  async function togglePublished(resource: TrainingResource) {
    const res = await fetch("/api/training", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: resource.id, published: !resource.published }),
    });
    const data = await res.json();
    if (res.ok) {
      toast.success(resource.published ? "Unpublished" : "Published");
      setLoading(true);
      await loadResources();
    } else {
      toast.error(data.error ?? "Failed to update training resource");
    }
  }

  if (sessionStatus === "loading" || loading) {
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
          <h1 className="text-2xl font-bold text-white">Training</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-400">
            {isEditor
              ? "Create and manage training materials for sales, mechanics, and managers."
              : "Training materials for your role."}
          </p>
        </div>
        {isEditor ? (
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Add Resource
          </Button>
        ) : null}
      </div>

      {isEditor ? (
        <div className="mb-6 rounded-xl border border-slate-700/50 bg-slate-800/30 p-4 text-sm text-slate-300">
          <div className="flex items-start gap-3">
            <GraduationCap className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
            <div>
              <p className="font-medium text-white">Training library</p>
              <p className="mt-1 text-slate-400">
                Unpublished resources are visible here but hidden from staff. Use sort order
                to control list position within each audience.
              </p>
            </div>
          </div>
        </div>
      ) : null}

      {isEditor ? (
        <div className="mb-4">
          <label
            htmlFor="training-audience-filter"
            className="mb-1 block text-sm font-medium text-slate-300"
          >
            Filter by audience
          </label>
          <select
            id="training-audience-filter"
            value={audienceFilter}
            onChange={(e) => setAudienceFilter(e.target.value)}
            className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
          >
            <option value="all">All audiences</option>
            {TRAINING_AUDIENCES.map((audience) => (
              <option key={audience} value={audience}>
                {audienceLabels[audience]}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      {filteredResources.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-700 py-16 text-center">
          <GraduationCap className="mx-auto mb-4 h-12 w-12 text-slate-600" />
          <p className="text-slate-400">No training materials yet.</p>
        </div>
      ) : isEditor ? (
        <div className="overflow-hidden rounded-xl border border-slate-700/50">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-900/80 text-slate-400">
              <tr>
                <th className="px-4 py-3 font-medium">Title</th>
                <th className="px-4 py-3 font-medium">Audience</th>
                <th className="px-4 py-3 font-medium">Kind</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Order</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 bg-slate-900/40">
              {filteredResources.map((resource) => (
                <tr key={resource.id}>
                  <td className="px-4 py-3 text-white">{resource.title}</td>
                  <td className="px-4 py-3 text-slate-300">
                    {audienceLabels[resource.audience]}
                  </td>
                  <td className="px-4 py-3 text-slate-300">{kindLabels[resource.kind]}</td>
                  <td className="px-4 py-3">
                    <Badge variant={resource.published ? "success" : "default"}>
                      {resource.published ? "Published" : "Draft"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-slate-400">{resource.sortOrder}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(resource)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => togglePublished(resource)}>
                        {resource.published ? "Unpublish" : "Publish"}
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(resource.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredResources.map((resource) => {
            const expanded = expandedId === resource.id;
            return (
              <div
                key={resource.id}
                className="overflow-hidden rounded-xl border border-slate-700/50 bg-slate-900/40"
              >
                <button
                  type="button"
                  onClick={() => setExpandedId(expanded ? null : resource.id)}
                  className="flex w-full items-start justify-between gap-4 px-5 py-4 text-left hover:bg-slate-800/40"
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-base font-semibold text-white">{resource.title}</h2>
                      <Badge variant="info">{kindLabels[resource.kind]}</Badge>
                    </div>
                    {resource.summary && !expanded ? (
                      <p className="mt-1 text-sm text-slate-400">{resource.summary}</p>
                    ) : null}
                  </div>
                  <span className="shrink-0 text-xs text-slate-500">
                    {expanded ? "Hide" : "View"}
                  </span>
                </button>
                {expanded ? (
                  <div className="border-t border-slate-800 px-5 py-4">
                    <TrainingResourceContent resource={resource} />
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}

      <Modal
        open={showForm}
        onClose={closeForm}
        title={editingId ? "Edit Training Resource" : "Add Training Resource"}
        size="lg"
      >
        <form onSubmit={handleSave} className="space-y-4">
          <Input
            id="training-title"
            name="title"
            label="Title"
            value={form.title}
            onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
            required
            error={errors.title}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="training-audience"
                className="mb-1 block text-sm font-medium text-slate-300"
              >
                Audience
              </label>
              <select
                id="training-audience"
                name="audience"
                value={form.audience}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    audience: e.target.value as TrainingAudience,
                  }))
                }
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
              >
                {TRAINING_AUDIENCES.map((audience) => (
                  <option key={audience} value={audience}>
                    {audienceLabels[audience]}
                  </option>
                ))}
              </select>
              {errors.audience ? (
                <p className="mt-1 text-xs text-red-400">{errors.audience}</p>
              ) : null}
            </div>
            <div>
              <label
                htmlFor="training-kind"
                className="mb-1 block text-sm font-medium text-slate-300"
              >
                Kind
              </label>
              <select
                id="training-kind"
                name="kind"
                value={form.kind}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, kind: e.target.value as TrainingKind }))
                }
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
              >
                {TRAINING_KINDS.map((kind) => (
                  <option key={kind} value={kind}>
                    {kindLabels[kind]}
                  </option>
                ))}
              </select>
              {errors.kind ? <p className="mt-1 text-xs text-red-400">{errors.kind}</p> : null}
            </div>
          </div>
          <Textarea
            id="training-summary"
            name="summary"
            label="Summary (optional)"
            value={form.summary}
            onChange={(e) => setForm((prev) => ({ ...prev, summary: e.target.value }))}
            rows={2}
            error={errors.summary}
          />
          <Textarea
            id="training-body"
            name="body"
            label="Body"
            value={form.body}
            onChange={(e) => setForm((prev) => ({ ...prev, body: e.target.value }))}
            rows={8}
            required
            error={errors.body}
          />
          {form.kind === "video" ? (
            <Input
              id="training-link-url"
              name="linkUrl"
              type="url"
              label="Video URL"
              value={form.linkUrl}
              onChange={(e) => setForm((prev) => ({ ...prev, linkUrl: e.target.value }))}
              placeholder="https://..."
              error={errors.linkUrl}
            />
          ) : null}
          {form.kind === "file" ? (
            <Input
              id="training-file-url"
              name="fileUrl"
              type="url"
              label="File URL"
              value={form.fileUrl}
              onChange={(e) => setForm((prev) => ({ ...prev, fileUrl: e.target.value }))}
              placeholder="https://..."
              error={errors.fileUrl}
            />
          ) : null}
          {(form.kind === "script" || form.kind === "sop") && (
            <Input
              id="training-link-url-optional"
              name="linkUrl"
              type="url"
              label="External link (optional)"
              value={form.linkUrl}
              onChange={(e) => setForm((prev) => ({ ...prev, linkUrl: e.target.value }))}
              placeholder="https://..."
              error={errors.linkUrl}
            />
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              id="training-sort-order"
              name="sortOrder"
              type="number"
              label="Sort order"
              value={form.sortOrder}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, sortOrder: Number(e.target.value) || 0 }))
              }
              error={errors.sortOrder}
            />
            <div className="flex items-end pb-2">
              <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-300">
                <input
                  type="checkbox"
                  checked={form.published}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, published: e.target.checked }))
                  }
                  className="rounded border-slate-600 bg-slate-900 text-red-600 focus:ring-red-500"
                />
                Published
              </label>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={closeForm}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : editingId ? "Save Changes" : "Create Resource"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
