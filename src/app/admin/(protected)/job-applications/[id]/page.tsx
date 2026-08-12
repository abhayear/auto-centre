"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Badge, statusVariant } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { formatStatusLabel } from "@/lib/applicant-tracking";
import {
  EVALUATION_RATING_OPTIONS,
  EvaluationScores,
  ScreeningResponses,
  formatEvaluationAverage,
  formatScreeningAnswer,
  getEvaluationCriteria,
  getRoleTemplateConfig,
  getScreeningQuestions,
  hasRoleScreening,
} from "@/lib/job-role-evaluation";
import { formatDate } from "@/lib/utils";

type Activity = {
  id: string;
  type: string;
  message: string;
  status: string | null;
  createdBy: string | null;
  createdAt: string;
};

type ApplicationDetail = {
  id: string;
  trackingCode: string;
  name: string;
  email: string;
  phone: string | null;
  resumeUrl: string | null;
  coverLetter: string | null;
  status: string;
  adminNotes: string | null;
  screeningResponses: ScreeningResponses | null;
  evaluationScores: EvaluationScores | null;
  createdAt: string;
  job: { title: string; department: string; location: string; roleTemplate: string };
  activities: Activity[];
};

type PageProps = { params: Promise<{ id: string }> };

export default function AdminApplicationDetailPage({ params }: PageProps) {
  const { id } = use(params);
  const [application, setApplication] = useState<ApplicationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("");
  const [adminNotes, setAdminNotes] = useState("");
  const [note, setNote] = useState("");
  const [evaluationScores, setEvaluationScores] = useState<EvaluationScores>({});

  useEffect(() => {
    let active = true;

    async function fetchApplication() {
      setLoading(true);
      const res = await fetch(`/api/job-applications/${id}`);
      const data = await res.json();
      if (!active) return;

      if (!res.ok) {
        toast.error(data.error ?? "Application not found");
        setApplication(null);
        setLoading(false);
        return;
      }

      setApplication(data);
      setStatus(data.status);
      setAdminNotes(data.adminNotes ?? "");
      setEvaluationScores((data.evaluationScores as EvaluationScores | null) ?? {});
      setLoading(false);
    }

    void fetchApplication();
    return () => {
      active = false;
    };
  }, [id]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!application) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/job-applications/${application.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          adminNotes: adminNotes.trim() || null,
          evaluationScores,
          ...(note.trim() ? { note: note.trim() } : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Failed to update application");
        return;
      }
      setApplication(data);
      setStatus(data.status);
      setAdminNotes(data.adminNotes ?? "");
      setEvaluationScores((data.evaluationScores as EvaluationScores | null) ?? {});
      setNote("");
      toast.success("Application updated");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-red-500" />
      </div>
    );
  }

  if (!application) {
    return (
      <div className="text-center">
        <p className="text-slate-400">Application not found.</p>
        <Link href="/admin/job-applications" className="mt-4 inline-block text-red-400">
          ← Back to Applicant Tracking
        </Link>
      </div>
    );
  }

  const roleTemplate = application.job.roleTemplate;
  const roleConfig = getRoleTemplateConfig(roleTemplate);
  const showScreening = hasRoleScreening(roleTemplate);
  const screeningQuestions = getScreeningQuestions(roleTemplate);
  const evaluationCriteria = getEvaluationCriteria(roleTemplate);
  const overallScore = formatEvaluationAverage(roleTemplate, application.evaluationScores);

  return (
    <div>
      <Link
        href="/admin/job-applications"
        className="mb-6 inline-flex items-center gap-2 text-sm text-red-400 hover:text-red-300"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Applicant Tracking
      </Link>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold text-white">{application.name}</h1>
            <Badge variant={statusVariant(application.status)}>{application.status}</Badge>
          </div>
          <p className="mt-1 text-slate-400">
            {application.email}
            {application.phone ? ` · ${application.phone}` : ""}
          </p>
          <p className="text-sm text-red-400">{application.job.title}</p>
          <p className="mt-1 font-mono text-sm text-amber-300">
            Tracking: {application.trackingCode}
          </p>
          {overallScore && (
            <p className="mt-1 text-sm font-medium text-green-400">ATS score: {overallScore}</p>
          )}
        </div>
        {application.resumeUrl && (
          <a
            href={application.resumeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-red-400 hover:text-red-300"
          >
            View resume / profile →
          </a>
        )}
      </div>

      {showScreening && application.screeningResponses && (
        <div className="mb-6 rounded-xl border border-amber-700/30 bg-amber-950/10 p-6">
          <h2 className="mb-4 text-lg font-semibold text-white">
            {roleConfig?.screeningTitle ?? "Screening responses"}
          </h2>
          <dl className="grid gap-3 sm:grid-cols-2">
            {screeningQuestions.map((question) => (
              <div key={question.id}>
                <dt className="text-xs text-slate-500">{question.label}</dt>
                <dd className="text-sm text-slate-200">
                  {formatScreeningAnswer(
                    question,
                    application.screeningResponses?.[question.id],
                  )}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      )}

      {showScreening && (
        <div className="mb-6 rounded-xl border border-slate-700/50 bg-slate-800/30 p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-semibold text-white">
              {roleConfig?.evaluationTitle ?? "Candidate evaluation (1–5)"}
            </h2>
            {formatEvaluationAverage(roleTemplate, evaluationScores) && (
              <span className="rounded-full bg-green-900/40 px-3 py-1 text-sm font-medium text-green-300">
                Overall: {formatEvaluationAverage(roleTemplate, evaluationScores)}
              </span>
            )}
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {evaluationCriteria.map((criterion) => (
              <div key={criterion.id}>
                <Select
                  id={`eval-${criterion.id}`}
                  label={criterion.label}
                  value={evaluationScores[criterion.id]?.toString() ?? ""}
                  onChange={(e) => {
                    const value = e.target.value;
                    setEvaluationScores((current) => {
                      const next = { ...current };
                      if (!value) {
                        delete next[criterion.id];
                      } else {
                        next[criterion.id] = Number(value);
                      }
                      return next;
                    });
                  }}
                  placeholder="Rate 1–5..."
                  options={[...EVALUATION_RATING_OPTIONS]}
                />
                <p className="mt-1 text-xs text-slate-500">
                  {criterion.description} ({criterion.lowLabel} → {criterion.highLabel})
                </p>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-slate-500">
            Rate each criterion after interview or practical assessment. Scores save with Update
            applicant below.
          </p>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <form
          onSubmit={handleSave}
          className="space-y-4 rounded-xl border border-slate-700/50 bg-slate-800/30 p-6"
        >
          <h2 className="text-lg font-semibold text-white">Update applicant</h2>
          <Select
            id="status"
            label="Pipeline stage"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            options={[
              { value: "new", label: "New" },
              { value: "reviewing", label: "Reviewing" },
              { value: "interviewed", label: "Interviewed" },
              { value: "rejected", label: "Rejected" },
              { value: "hired", label: "Hired" },
            ]}
          />
          <Textarea
            id="adminNotes"
            label="Internal notes"
            rows={4}
            value={adminNotes}
            onChange={(e) => setAdminNotes(e.target.value)}
            placeholder="Private notes visible only to admin/managers..."
          />
          <Input
            id="note"
            label="Add timeline note (optional)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. Called candidate, interview scheduled for Friday"
          />
          <Button type="submit" loading={saving}>
            Save changes
          </Button>
        </form>

        <div className="rounded-xl border border-slate-700/50 bg-slate-800/30 p-6">
          <h2 className="mb-4 text-lg font-semibold text-white">Application details</h2>
          {application.coverLetter ? (
            <p className="mb-4 text-sm leading-relaxed text-slate-300">{application.coverLetter}</p>
          ) : (
            <p className="mb-4 text-sm text-slate-500">No cover letter provided.</p>
          )}
          <dl className="space-y-2 text-sm text-slate-400">
            <div>
              <dt className="text-slate-500">Department</dt>
              <dd className="text-slate-200">{application.job.department}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Location</dt>
              <dd className="text-slate-200">{application.job.location}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Applied</dt>
              <dd className="text-slate-200">{formatDate(application.createdAt)}</dd>
            </div>
          </dl>
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-slate-700/50 bg-slate-800/30 p-6">
        <h2 className="mb-4 text-lg font-semibold text-white">Activity timeline</h2>
        <div className="space-y-4">
          {application.activities.length === 0 ? (
            <p className="text-sm text-slate-500">No activity yet.</p>
          ) : (
            application.activities.map((activity) => (
              <div key={activity.id} className="border-l-2 border-slate-700 pl-4">
                <p className="text-sm text-white">
                  {activity.type === "status_change" && activity.status
                    ? formatStatusLabel(activity.status)
                    : activity.message}
                </p>
                {activity.type === "status_change" && (
                  <p className="text-sm text-slate-400">{activity.message}</p>
                )}
                <p className="mt-1 text-xs text-slate-500">
                  {formatDate(activity.createdAt)}
                  {activity.createdBy ? ` · ${activity.createdBy}` : ""}
                </p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
