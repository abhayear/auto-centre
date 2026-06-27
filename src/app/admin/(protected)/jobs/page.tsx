"use client";

import { JobPosting } from "@prisma/client";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Badge, statusVariant } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { JobForm } from "@/components/forms/JobForm";
import { formatEmploymentType } from "@/lib/utils";

type JobWithCount = JobPosting & { _count?: { applications: number } };

export default function AdminJobsPage() {
  const [jobs, setJobs] = useState<JobWithCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingJob, setEditingJob] = useState<JobPosting | undefined>();

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const res = await fetch("/api/jobs?all=true");
        const text = await res.text();
        const data = text ? JSON.parse(text) : [];

        if (!res.ok) {
          toast.error(data.error ?? "Failed to load job postings");
          if (active) setLoading(false);
          return;
        }

        if (active) {
          setJobs(Array.isArray(data) ? data : []);
          setLoading(false);
        }
      } catch {
        toast.error("Failed to load job postings");
        if (active) setLoading(false);
      }
    }

    load();
    return () => {
      active = false;
    };
  }, []);

  async function refreshJobs() {
    const res = await fetch("/api/jobs?all=true");
    const text = await res.text();
    if (!text) return;
    const data = JSON.parse(text);
    if (Array.isArray(data)) setJobs(data);
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this job posting?")) return;

    const res = await fetch(`/api/jobs?id=${id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Job posting deleted");
      refreshJobs();
    } else {
      toast.error("Failed to delete job posting");
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
        <h1 className="text-2xl font-bold text-white">Job Postings</h1>
        <Button
          onClick={() => {
            setEditingJob(undefined);
            setShowForm(true);
          }}
        >
          <Plus className="h-4 w-4" />
          Add Job
        </Button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-700/50">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-700 bg-slate-800/50">
            <tr>
              <th className="px-4 py-3 font-medium text-slate-300">Title</th>
              <th className="px-4 py-3 font-medium text-slate-300">Department</th>
              <th className="px-4 py-3 font-medium text-slate-300">Type</th>
              <th className="px-4 py-3 font-medium text-slate-300">Status</th>
              <th className="px-4 py-3 font-medium text-slate-300">Applications</th>
              <th className="px-4 py-3 font-medium text-slate-300">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700/50">
            {jobs.map((job) => (
              <tr key={job.id} className="hover:bg-slate-800/30">
                <td className="px-4 py-3 text-white">{job.title}</td>
                <td className="px-4 py-3 text-slate-300">{job.department}</td>
                <td className="px-4 py-3 text-slate-300">
                  {formatEmploymentType(job.employmentType)}
                </td>
                <td className="px-4 py-3">
                  <Badge variant={statusVariant(job.status)}>{job.status}</Badge>
                </td>
                <td className="px-4 py-3 text-slate-300">
                  {job._count?.applications ?? 0}
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setEditingJob(job);
                        setShowForm(true);
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(job.id)}>
                      <Trash2 className="h-4 w-4 text-red-400" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {jobs.length === 0 && (
          <p className="py-8 text-center text-slate-400">No job postings yet.</p>
        )}
      </div>

      {showForm && (
        <JobForm
          job={editingJob}
          onSuccess={() => {
            setShowForm(false);
            setEditingJob(undefined);
            refreshJobs();
          }}
          onCancel={() => {
            setShowForm(false);
            setEditingJob(undefined);
          }}
        />
      )}
    </div>
  );
}
