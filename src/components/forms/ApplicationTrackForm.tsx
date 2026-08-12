"use client";

import { useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { Badge, statusVariant } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { formatDate } from "@/lib/utils";

type TrackResult = {
  trackingCode: string;
  name: string;
  status: string;
  statusLabel: string;
  jobTitle: string;
  department: string;
  location: string;
  appliedAt: string;
  updatedAt: string;
  timeline: {
    message: string;
    status: string | null;
    statusLabel: string | null;
    at: string;
  }[];
};

type PageProps = {
  initialCode?: string;
  initialEmail?: string;
};

export function ApplicationTrackForm({ initialCode = "", initialEmail = "" }: PageProps) {
  const [trackingCode, setTrackingCode] = useState(initialCode);
  const [email, setEmail] = useState(initialEmail);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<TrackResult | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setResult(null);

    try {
      const params = new URLSearchParams({
        trackingCode: trackingCode.trim().toUpperCase(),
        email: email.trim(),
      });
      const res = await fetch(`/api/job-applications/track?${params}`);
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Application not found. Check your code and email.");
        return;
      }

      setResult(data);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          id="trackingCode"
          label="Tracking code"
          value={trackingCode}
          onChange={(e) => setTrackingCode(e.target.value.toUpperCase())}
          placeholder="AG-XXXXXX"
          required
        />
        <Input
          id="email"
          type="email"
          label="Email address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          required
        />
        {error && <p className="text-sm text-red-400">{error}</p>}
        <Button type="submit" loading={loading}>
          Track application
        </Button>
      </form>

      {loading && !result && (
        <div className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-red-500" />
        </div>
      )}

      {result && (
        <div className="rounded-xl border border-green-700/40 bg-green-950/20 p-6">
          <div className="mb-4 flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-green-400" />
            <div>
              <p className="font-medium text-white">{result.name}</p>
              <p className="text-sm text-slate-400">{result.jobTitle}</p>
              <p className="mt-1 font-mono text-sm text-amber-300">{result.trackingCode}</p>
            </div>
            <Badge variant={statusVariant(result.status)} className="ml-auto">
              {result.statusLabel}
            </Badge>
          </div>

          <dl className="mb-6 grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-slate-500">Department</dt>
              <dd className="text-slate-200">{result.department}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Location</dt>
              <dd className="text-slate-200">{result.location}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Applied</dt>
              <dd className="text-slate-200">{formatDate(result.appliedAt)}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Last updated</dt>
              <dd className="text-slate-200">{formatDate(result.updatedAt)}</dd>
            </div>
          </dl>

          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-300">
            Status timeline
          </h3>
          <div className="space-y-4">
            {result.timeline.map((entry, index) => (
              <div key={`${entry.at}-${index}`} className="border-l-2 border-slate-700 pl-4">
                <p className="text-sm text-white">
                  {entry.statusLabel ?? entry.message}
                </p>
                {entry.statusLabel && entry.message !== entry.statusLabel && (
                  <p className="text-sm text-slate-400">{entry.message}</p>
                )}
                <p className="mt-1 text-xs text-slate-500">{formatDate(entry.at)}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
