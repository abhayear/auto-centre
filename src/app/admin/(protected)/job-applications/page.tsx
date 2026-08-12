"use client";

import { JobApplication, JobPosting } from "@prisma/client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Search } from "lucide-react";
import toast from "react-hot-toast";
import { Badge, statusVariant } from "@/components/ui/Badge";
import { Card, CardContent } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { APPLICATION_STATUS_LABELS } from "@/lib/applicant-tracking";
import {
  EvaluationScores,
  formatEvaluationAverage,
  hasRoleScreening,
} from "@/lib/job-role-evaluation";
import { formatDate } from "@/lib/utils";

type ApplicationWithJob = JobApplication & {
  job: JobPosting;
  evaluationScores?: EvaluationScores | null;
};

type PipelineStats = {
  total: number;
  newThisWeek: number;
  pipeline: { status: string; count: number }[];
  byJob: { jobId: string; jobTitle: string; count: number }[];
};

export default function AdminJobApplicationsPage() {
  const [applications, setApplications] = useState<ApplicationWithJob[]>([]);
  const [stats, setStats] = useState<PipelineStats | null>(null);
  const [statusFilter, setStatusFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [appliedQuery, setAppliedQuery] = useState("");
  const [loading, setLoading] = useState(true);

  const buildListUrl = useCallback(() => {
    const params = new URLSearchParams();
    if (statusFilter) params.set("status", statusFilter);
    if (appliedQuery.trim()) params.set("q", appliedQuery.trim());
    const query = params.toString();
    return query ? `/api/job-applications?${query}` : "/api/job-applications";
  }, [statusFilter, appliedQuery]);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const [listRes, statsRes] = await Promise.all([
          fetch(buildListUrl()),
          fetch("/api/job-applications/stats"),
        ]);

        const listText = await listRes.text();
        const listData = listText ? JSON.parse(listText) : [];

        if (!listRes.ok) {
          toast.error(listData.error ?? "Failed to load applications");
        } else if (active) {
          setApplications(Array.isArray(listData) ? listData : []);
        }

        if (statsRes.ok) {
          const statsData = await statsRes.json();
          if (active) setStats(statsData);
        }
      } catch {
        toast.error("Failed to load applications");
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    return () => {
      active = false;
    };
  }, [buildListUrl]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setAppliedQuery(searchQuery);
    setLoading(true);
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
        <h1 className="text-2xl font-bold text-white">Applicant Tracking</h1>
        <div className="w-48">
          <Select
            value={statusFilter}
            onChange={(e) => {
              setLoading(true);
              setStatusFilter(e.target.value);
            }}
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

      {stats && (
        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent>
              <p className="text-sm text-slate-400">Total applicants</p>
              <p className="text-2xl font-bold text-white">{stats.total}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent>
              <p className="text-sm text-slate-400">New this week</p>
              <p className="text-2xl font-bold text-white">{stats.newThisWeek}</p>
            </CardContent>
          </Card>
          <Card className="sm:col-span-2">
            <CardContent>
              <p className="mb-2 text-sm text-slate-400">Pipeline</p>
              <div className="flex flex-wrap gap-2">
                {stats.pipeline.map((row) => (
                  <Badge key={row.status} variant={statusVariant(row.status)}>
                    {APPLICATION_STATUS_LABELS[row.status as keyof typeof APPLICATION_STATUS_LABELS] ??
                      row.status}
                    : {row.count}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <form onSubmit={handleSearch} className="mb-6 flex gap-3">
        <div className="flex-1">
          <Input
            id="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, email, or tracking code..."
          />
        </div>
        <button
          type="submit"
          className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-500"
        >
          <Search className="h-4 w-4" />
          Search
        </button>
      </form>

      <div className="space-y-4">
        {applications.map((app) => (
          <Link
            key={app.id}
            href={`/admin/job-applications/${app.id}`}
            className="block rounded-xl border border-slate-700/50 bg-slate-800/30 p-4 transition-colors hover:border-red-600/40 hover:bg-slate-800/50"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium text-white">{app.name}</p>
                  <Badge variant={statusVariant(app.status)}>{app.status}</Badge>
                </div>
                <p className="text-sm text-slate-400">
                  {app.email}
                  {app.phone && ` · ${app.phone}`}
                </p>
                <p className="text-sm text-red-400">Applied for: {app.job.title}</p>
                <p className="mt-1 font-mono text-xs text-amber-300">{app.trackingCode}</p>
                {hasRoleScreening(app.job.roleTemplate) && (
                  <p className="mt-1 text-xs text-green-400">
                    ATS score:{" "}
                    {formatEvaluationAverage(
                      app.job.roleTemplate,
                      app.evaluationScores as EvaluationScores | null,
                    ) ?? "Not rated"}
                  </p>
                )}
              </div>
              <p className="text-xs text-slate-500">{formatDate(app.createdAt)}</p>
            </div>
          </Link>
        ))}
        {applications.length === 0 && (
          <p className="py-8 text-center text-slate-400">No applications found.</p>
        )}
      </div>
    </div>
  );
}
