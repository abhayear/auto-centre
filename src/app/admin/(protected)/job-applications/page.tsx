"use client";

import { JobApplication, JobPosting } from "@prisma/client";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Badge, statusVariant } from "@/components/ui/Badge";
import { Select } from "@/components/ui/Select";
import { formatDate } from "@/lib/utils";

type ApplicationWithJob = JobApplication & { job: JobPosting };

export default function AdminJobApplicationsPage() {
  const [applications, setApplications] = useState<ApplicationWithJob[]>([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function load() {
      const url = statusFilter
        ? `/api/job-applications?status=${statusFilter}`
        : "/api/job-applications";

      try {
        const res = await fetch(url);
        const text = await res.text();
        const data = text ? JSON.parse(text) : [];

        if (!res.ok) {
          toast.error(data.error ?? "Failed to load applications");
          if (active) setLoading(false);
          return;
        }

        if (active) {
          setApplications(Array.isArray(data) ? data : []);
          setLoading(false);
        }
      } catch {
        toast.error("Failed to load applications");
        if (active) setLoading(false);
      }
    }

    load();
    return () => {
      active = false;
    };
  }, [statusFilter]);

  async function refreshApplications() {
    const url = statusFilter
      ? `/api/job-applications?status=${statusFilter}`
      : "/api/job-applications";
    const res = await fetch(url);
    const text = await res.text();
    const data = text ? JSON.parse(text) : [];
    if (res.ok && Array.isArray(data)) {
      setApplications(data);
    }
  }

  async function updateStatus(id: string, status: string) {
    const res = await fetch("/api/job-applications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });

    if (res.ok) {
      toast.success("Status updated");
      refreshApplications();
    } else {
      toast.error("Failed to update status");
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
        <h1 className="text-2xl font-bold text-white">Job Applications</h1>
        <div className="w-48">
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            options={[
              { value: "new", label: "New" },
              { value: "reviewing", label: "Reviewing" },
              { value: "interviewed", label: "Interviewed" },
              { value: "rejected", label: "Rejected" },
              { value: "hired", label: "Hired" },
            ]}
            placeholder="All Statuses"
          />
        </div>
      </div>

      <div className="space-y-4">
        {applications.map((app) => (
          <div
            key={app.id}
            className="rounded-xl border border-slate-700/50 bg-slate-800/30 p-4"
          >
            <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-medium text-white">{app.name}</p>
                  <Badge variant={statusVariant(app.status)}>{app.status}</Badge>
                </div>
                <p className="text-sm text-slate-400">
                  {app.email}
                  {app.phone && ` · ${app.phone}`}
                </p>
                <p className="text-sm text-red-400">Applied for: {app.job.title}</p>
                {app.resumeUrl && (
                  <a
                    href={app.resumeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 inline-block text-sm text-red-400 hover:text-red-300"
                  >
                    View resume / profile →
                  </a>
                )}
              </div>
              <div className="w-40">
                <Select
                  value={app.status}
                  onChange={(e) => updateStatus(app.id, e.target.value)}
                  options={[
                    { value: "new", label: "New" },
                    { value: "reviewing", label: "Reviewing" },
                    { value: "interviewed", label: "Interviewed" },
                    { value: "rejected", label: "Rejected" },
                    { value: "hired", label: "Hired" },
                  ]}
                />
              </div>
            </div>
            {app.coverLetter && (
              <p className="text-sm text-slate-300">{app.coverLetter}</p>
            )}
            <p className="mt-2 text-xs text-slate-500">{formatDate(app.createdAt)}</p>
          </div>
        ))}
        {applications.length === 0 && (
          <p className="py-8 text-center text-slate-400">No applications found.</p>
        )}
      </div>
    </div>
  );
}
