import Link from "next/link";
import { Briefcase, MapPin, Clock } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { prisma } from "@/lib/prisma";
import { safeDbQuery } from "@/lib/safe-db";
import { formatEmploymentType } from "@/lib/utils";
import { SITE_NAME } from "@/lib/constants";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Careers",
  description: `Join our team at ${SITE_NAME}. Explore open positions in sales, service, and more.`,
};

export default async function CareersPage() {
  const jobs = await safeDbQuery(
    () =>
      prisma.jobPosting.findMany({
        where: { active: true, status: "open" },
        orderBy: { createdAt: "desc" },
      }),
    []
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-10">
        <h1 className="text-3xl font-bold text-white">Careers</h1>
        <p className="mt-2 max-w-2xl text-slate-400">
          Build your career with a team that values expertise, customer service, and growth.
          Explore our current openings below.
        </p>
      </div>

      {jobs.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-700 py-16 text-center">
          <Briefcase className="mx-auto mb-4 h-12 w-12 text-slate-600" />
          <p className="text-lg text-slate-400">No open positions at the moment.</p>
          <p className="mt-1 text-sm text-slate-500">
            Check back soon or{" "}
            <Link href="/contact" className="text-red-400 hover:text-red-300">
              contact us
            </Link>{" "}
            to express your interest.
          </p>
        </div>
      ) : (
        <div className="grid gap-6">
          {jobs.map((job) => (
            <Link key={job.id} href={`/careers/${job.id}`}>
              <Card className="transition-all hover:border-red-600/50 hover:shadow-lg hover:shadow-red-900/10">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-semibold text-white">{job.title}</h2>
                    <p className="mt-1 text-sm text-slate-400">{job.department}</p>
                    <div className="mt-3 flex flex-wrap gap-4 text-sm text-slate-400">
                      <span className="flex items-center gap-1.5">
                        <MapPin className="h-4 w-4 text-red-500" />
                        {job.location}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Clock className="h-4 w-4 text-red-500" />
                        {formatEmploymentType(job.employmentType)}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <Badge variant="success">Open</Badge>
                    {job.salaryRange && (
                      <span className="text-sm font-medium text-red-400">{job.salaryRange}</span>
                    )}
                  </div>
                </div>
                <p className="mt-4 line-clamp-2 text-sm text-slate-300">{job.description}</p>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
