"use client";

import Link from "next/link";
import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";

interface JobApplicationFormProps {
  jobId: string;
  jobTitle: string;
}

type SubmitSuccess = {
  trackingCode: string;
  email: string;
};

export function JobApplicationForm({ jobId, jobTitle }: JobApplicationFormProps) {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<SubmitSuccess | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());

    try {
      const res = await fetch("/api/job-applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, jobId }),
      });

      const result = await res.json();

      if (!res.ok) {
        toast.error(result.error ?? "Failed to submit application");
        return;
      }

      setSuccess({
        trackingCode: result.trackingCode,
        email: result.email,
      });
      toast.success("Application submitted successfully!");
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    const trackHref = `/careers/track?code=${encodeURIComponent(success.trackingCode)}&email=${encodeURIComponent(success.email)}`;

    return (
      <div className="rounded-lg border border-green-700/40 bg-green-950/20 p-6 text-center">
        <CheckCircle2 className="mx-auto mb-3 h-10 w-10 text-green-400" />
        <h3 className="text-lg font-semibold text-white">Application submitted!</h3>
        <p className="mt-2 text-sm text-slate-400">
          Save your tracking code to check your application status anytime.
        </p>
        <p className="mt-4 font-mono text-2xl font-bold tracking-wider text-amber-300">
          {success.trackingCode}
        </p>
        <Link
          href={trackHref}
          className="mt-4 inline-block text-sm font-medium text-red-400 hover:text-red-300"
        >
          Track your application →
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="rounded-lg border border-slate-700 bg-slate-800/50 px-4 py-3">
        <p className="text-sm text-slate-400">Applying for</p>
        <p className="font-medium text-white">{jobTitle}</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Input id="name" name="name" label="Full Name" required />
        <Input id="email" name="email" type="email" label="Email" required />
      </div>
      <Input id="phone" name="phone" type="tel" label="Phone (optional)" />
      <Input
        id="resumeUrl"
        name="resumeUrl"
        type="url"
        label="Resume / LinkedIn URL"
        placeholder="https://linkedin.com/in/yourprofile"
      />
      <Textarea
        id="coverLetter"
        name="coverLetter"
        label="Cover Letter (optional)"
        rows={4}
        placeholder="Tell us why you'd be a great fit..."
      />
      <Button type="submit" loading={loading}>
        Submit Application
      </Button>
    </form>
  );
}
