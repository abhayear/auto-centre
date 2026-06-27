"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";

interface JobApplicationFormProps {
  jobId: string;
  jobTitle: string;
}

export function JobApplicationForm({ jobId, jobTitle }: JobApplicationFormProps) {
  const [loading, setLoading] = useState(false);

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

      toast.success("Application submitted! We'll review your profile soon.");
      (e.target as HTMLFormElement).reset();
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
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
