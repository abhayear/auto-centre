"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { CalendarClock, ExternalLink, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

type ServiceScheduleFormData = {
  title: string;
  summary: string;
  content: string;
  published: boolean;
};

export function ServiceScheduleForm() {
  const [schedule, setSchedule] = useState<ServiceScheduleFormData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    fetch("/api/service-schedule")
      .then((res) => res.json())
      .then((data) => {
        setSchedule({
          title: data.title ?? "",
          summary: data.summary ?? "",
          content: data.content ?? "",
          published: Boolean(data.published),
        });
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!schedule) return;

    setSaving(true);
    try {
      const res = await fetch("/api/service-schedule", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: schedule.title,
          summary: schedule.summary.trim() || null,
          content: schedule.content,
          published: schedule.published,
        }),
      });
      const result = await res.json();

      if (!res.ok) {
        const detail = result.details?.[0]?.message;
        toast.error(detail ?? result.error ?? "Failed to save schedule");
        return;
      }

      setSchedule({
        title: result.title,
        summary: result.summary ?? "",
        content: result.content,
        published: result.published,
      });
      toast.success("Service schedule updated");
    } catch {
      toast.error("Failed to save schedule");
    } finally {
      setSaving(false);
    }
  }

  async function handleResetDefault() {
    if (!confirm("Reset content to the default Auto Galaxy service schedule template?")) return;

    setResetting(true);
    try {
      const res = await fetch("/api/service-schedule", { method: "PUT" });
      const result = await res.json();

      if (!res.ok) {
        toast.error(result.error ?? "Failed to reset template");
        return;
      }

      setSchedule({
        title: result.title,
        summary: result.summary ?? "",
        content: result.content,
        published: result.published,
      });
      toast.success("Default template restored");
    } catch {
      toast.error("Failed to reset template");
    } finally {
      setResetting(false);
    }
  }

  if (loading) {
    return (
      <div className="rounded-xl border border-slate-700/50 bg-slate-800/30 p-6">
        <div className="h-6 w-48 animate-pulse rounded bg-slate-700" />
      </div>
    );
  }

  if (!schedule) return null;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-400">
          Edit the public service schedule page. Use Markdown for headings, lists, and tables.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="ghost"
            loading={resetting}
            onClick={() => void handleResetDefault()}
          >
            <RotateCcw className="h-4 w-4" />
            Reset template
          </Button>
          <a
            href="/service-schedule"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg border border-slate-600 px-3 py-2 text-sm text-slate-200 hover:bg-slate-800"
          >
            <ExternalLink className="h-4 w-4" />
            Preview page
          </a>
        </div>
      </div>

      <section className="rounded-xl border border-slate-700/50 bg-slate-800/30 p-6">
        <div className="mb-4 flex items-center gap-2">
          <CalendarClock className="h-5 w-5 text-red-500" />
          <h2 className="text-lg font-semibold text-white">Page details</h2>
        </div>

        <div className="space-y-4">
          <Input
            id="title"
            label="Page title"
            value={schedule.title}
            onChange={(e) => setSchedule({ ...schedule, title: e.target.value })}
            required
          />

          <div>
            <label htmlFor="summary" className="mb-1 block text-sm font-medium text-slate-300">
              Short summary
            </label>
            <textarea
              id="summary"
              value={schedule.summary}
              onChange={(e) => setSchedule({ ...schedule, summary: e.target.value })}
              rows={2}
              maxLength={500}
              placeholder="Shown under the title on the public page"
              className="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-white placeholder:text-slate-500 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
            />
          </div>

          <label className="flex items-center gap-2 text-sm text-slate-300">
            <input
              type="checkbox"
              checked={schedule.published}
              onChange={(e) => setSchedule({ ...schedule, published: e.target.checked })}
              className="rounded border-slate-600 bg-slate-800 text-red-600"
            />
            Publish on the website
          </label>
        </div>
      </section>

      <section className="rounded-xl border border-slate-700/50 bg-slate-800/30 p-6">
        <label htmlFor="content" className="mb-1 block text-sm font-medium text-slate-300">
          Schedule content (Markdown)
        </label>
        <p className="mb-3 text-xs text-slate-500">
          Use ## for sections, ### for subsections, **bold**, bullet lists, and tables. Internal
          links: [Book service](/book-service)
        </p>
        <textarea
          id="content"
          value={schedule.content}
          onChange={(e) => setSchedule({ ...schedule, content: e.target.value })}
          rows={24}
          required
          className="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 font-mono text-sm text-white placeholder:text-slate-500 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
        />
      </section>

      <Button type="submit" loading={saving}>
        Save service schedule
      </Button>
    </form>
  );
}
