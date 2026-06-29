import Link from "next/link";
import { ONLINE_STORE_URL, SITE_NAME } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { safeDbQuery } from "@/lib/safe-db";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sitemap",
  description: `Browse all pages on the ${SITE_NAME} website.`,
};

export const dynamic = "force-dynamic";

const mainPages = [
  { href: "/", label: "Home" },
  { href: "/vehicles", label: "E-Scooters" },
  { href: "/services", label: "Services" },
  { href: "/book-service", label: "Book Service" },
  { href: "/test-drive", label: "Test Ride" },
  { href: "/service-schedule", label: "Service Schedule" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
  { href: "/careers", label: "Careers" },
  { href: "/investment", label: "Investment Proposal" },
];

export default async function SitemapPage() {
  const [vehicles, jobs] = await Promise.all([
    safeDbQuery(
      () =>
        prisma.vehicle.findMany({
          where: { status: "available" },
          orderBy: { createdAt: "desc" },
          select: { id: true, make: true, model: true, year: true },
        }),
      []
    ),
    safeDbQuery(
      () =>
        prisma.jobPosting.findMany({
          where: { active: true, status: "open" },
          orderBy: { createdAt: "desc" },
          select: { id: true, title: true },
        }),
      []
    ),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-10 max-w-3xl">
        <h1 className="text-3xl font-bold text-white">Sitemap</h1>
        <p className="mt-2 text-slate-400">
          All pages on {SITE_NAME}. Search engines use{" "}
          <a href="/sitemap.xml" className="text-red-400 hover:text-red-300">
            sitemap.xml
          </a>
          .
        </p>
      </div>

      <div className="grid gap-10 lg:grid-cols-2">
        <section className="rounded-xl border border-slate-700/50 bg-slate-800/30 p-6">
          <h2 className="mb-4 text-lg font-semibold text-white">Main Pages</h2>
          <ul className="space-y-2 text-slate-300">
            {mainPages.map((page) => (
              <li key={page.href}>
                <Link href={page.href} className="hover:text-red-400">
                  {page.label}
                </Link>
              </li>
            ))}
            <li>
              <a
                href={ONLINE_STORE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-red-400"
              >
                Online Store
              </a>
            </li>
          </ul>
        </section>

        <section className="rounded-xl border border-slate-700/50 bg-slate-800/30 p-6">
          <h2 className="mb-4 text-lg font-semibold text-white">E-Scooters</h2>
          {vehicles.length === 0 ? (
            <p className="text-slate-400">No listings currently available.</p>
          ) : (
            <ul className="space-y-2 text-slate-300">
              {vehicles.map((vehicle) => (
                <li key={vehicle.id}>
                  <Link href={`/vehicles/${vehicle.id}`} className="hover:text-red-400">
                    {vehicle.year} {vehicle.make} {vehicle.model}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-xl border border-slate-700/50 bg-slate-800/30 p-6 lg:col-span-2">
          <h2 className="mb-4 text-lg font-semibold text-white">Open Positions</h2>
          {jobs.length === 0 ? (
            <p className="text-slate-400">No open roles at the moment.</p>
          ) : (
            <ul className="grid gap-2 sm:grid-cols-2 text-slate-300">
              {jobs.map((job) => (
                <li key={job.id}>
                  <Link href={`/careers/${job.id}`} className="hover:text-red-400">
                    {job.title}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
