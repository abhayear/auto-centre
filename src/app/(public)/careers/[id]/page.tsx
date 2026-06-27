import Link from "next/link";
import { notFound } from "next/navigation";
import { MapPin, Clock, Briefcase } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { JobApplicationForm } from "@/components/forms/JobApplicationForm";
import { prisma } from "@/lib/prisma";
import { formatEmploymentType } from "@/lib/utils";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const job = await prisma.jobPosting.findUnique({ where: { id } });
  if (!job) return { title: "Job Not Found" };
  return {
    title: `${job.title} — Careers`,
    description: job.description.slice(0, 160),
  };
}

export default async function CareerDetailPage({ params }: PageProps) {
  const { id } = await params;
  const job = await prisma.jobPosting.findUnique({ where: { id } });

  if (!job || !job.active || job.status !== "open") notFound();

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <Link href="/careers" className="mb-6 inline-block text-sm text-red-400 hover:text-red-300">
        ← Back to careers
      </Link>

      <div className="grid gap-10 lg:grid-cols-2">
        <div>
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <Badge variant="success">Open</Badge>
            <Badge variant="default">{job.department}</Badge>
          </div>

          <h1 className="text-3xl font-bold text-white">{job.title}</h1>

          <div className="mt-4 flex flex-wrap gap-4 text-sm text-slate-400">
            <span className="flex items-center gap-1.5">
              <MapPin className="h-4 w-4 text-red-500" />
              {job.location}
            </span>
            <span className="flex items-center gap-1.5">
              <Clock className="h-4 w-4 text-red-500" />
              {formatEmploymentType(job.employmentType)}
            </span>
            {job.salaryRange && (
              <span className="flex items-center gap-1.5">
                <Briefcase className="h-4 w-4 text-red-500" />
                {job.salaryRange}
              </span>
            )}
          </div>

          <div className="mt-8 space-y-6">
            <div>
              <h2 className="mb-2 text-lg font-semibold text-white">About the Role</h2>
              <p className="whitespace-pre-line text-slate-300 leading-relaxed">
                {job.description}
              </p>
            </div>
            <div>
              <h2 className="mb-2 text-lg font-semibold text-white">Requirements</h2>
              <p className="whitespace-pre-line text-slate-300 leading-relaxed">
                {job.requirements}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-700/50 bg-slate-800/30 p-6 lg:sticky lg:top-24 lg:self-start">
          <h2 className="mb-4 text-lg font-semibold text-white">Apply for this Position</h2>
          <JobApplicationForm jobId={job.id} jobTitle={job.title} />
        </div>
      </div>
    </div>
  );
}
