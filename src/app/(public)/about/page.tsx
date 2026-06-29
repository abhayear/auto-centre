import { Award, Users, Zap } from "lucide-react";
import { EsteemedCustomersSection } from "@/components/customers/EsteemedCustomersSection";
import { SITE_ADDRESS, SITE_NAME } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { safeDbQuery } from "@/lib/safe-db";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About",
  description: `Learn about ${SITE_NAME} — electric 2-wheeler sales and service in Lalitpur.`,
};

export const dynamic = "force-dynamic";

export default async function AboutPage() {
  const esteemedCustomers = await safeDbQuery(
    () =>
      prisma.esteemedCustomer.findMany({
        where: { active: true },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      }),
    []
  );

  return (
    <>
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="mb-12 max-w-3xl">
          <h1 className="text-3xl font-bold text-white">About {SITE_NAME}</h1>
          <p className="mt-4 text-lg leading-relaxed text-slate-300">
            {SITE_NAME} is Lalitpur&apos;s dedicated destination for electric 2-wheeler sales
            and service. Located at {SITE_ADDRESS}, we help riders switch to clean,
            affordable electric mobility with expert guidance and reliable after-sales care.
          </p>
        </div>

        <div className="mb-16 grid gap-8 md:grid-cols-3">
          <div className="rounded-xl border border-slate-700/50 bg-slate-800/30 p-6 text-center">
            <Zap className="mx-auto mb-4 h-10 w-10 text-red-500" />
            <h2 className="text-xl font-bold text-white">300+</h2>
            <p className="mt-1 text-slate-400">E-Scooters Sold</p>
          </div>
          <div className="rounded-xl border border-slate-700/50 bg-slate-800/30 p-6 text-center">
            <Users className="mx-auto mb-4 h-10 w-10 text-red-500" />
            <h2 className="text-xl font-bold text-white">Expert</h2>
            <p className="mt-1 text-slate-400">EV-Trained Team</p>
          </div>
          <div className="rounded-xl border border-slate-700/50 bg-slate-800/30 p-6 text-center">
            <Award className="mx-auto mb-4 h-10 w-10 text-red-500" />
            <h2 className="text-xl font-bold text-white">Authorized</h2>
            <p className="mt-1 text-slate-400">Sales & Service Partner</p>
          </div>
        </div>

        <div className="grid gap-10 lg:grid-cols-2">
          <div>
            <h2 className="mb-4 text-2xl font-bold text-white">Our Story</h2>
            <div className="space-y-4 leading-relaxed text-slate-300">
              <p>
                {SITE_NAME} was founded with a simple mission: make electric 2-wheelers
                accessible to families and commuters across Lalitpur and Bundelkhand. From
                your first test ride to routine battery checks, we are with you at every step.
              </p>
              <p>
                Our showroom on Siddhan Road stocks popular electric scooters and bikes. Our
                service bay is equipped for battery diagnostics, motor service, brake work,
                and general maintenance — all tailored for EVs.
              </p>
            </div>
          </div>

          <div>
            <h2 className="mb-4 text-2xl font-bold text-white">What We Offer</h2>
            <div className="space-y-4">
              {[
                {
                  title: "Electric 2-Wheeler Sales",
                  detail: "New and certified pre-owned e-scooters from top brands.",
                },
                {
                  title: "EV Service & Repairs",
                  detail: "Battery health, motor diagnostics, brakes, tyres, and more.",
                },
                {
                  title: "Test Rides & Financing Help",
                  detail: "Try before you buy with guidance on loans and subsidies.",
                },
              ].map((item) => (
                <div
                  key={item.title}
                  className="rounded-lg border border-slate-700/50 bg-slate-800/30 p-4"
                >
                  <p className="font-medium text-white">{item.title}</p>
                  <p className="text-sm text-slate-400">{item.detail}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-16 rounded-xl border border-slate-700/50 bg-slate-800/30 p-8">
          <h2 className="mb-4 text-2xl font-bold text-white">Why Choose Us</h2>
          <ul className="grid gap-3 text-slate-300 sm:grid-cols-2">
            <li className="flex items-center gap-2">
              <Award className="h-4 w-4 text-red-500" />
              Specialized electric 2-wheeler expertise
            </li>
            <li className="flex items-center gap-2">
              <Award className="h-4 w-4 text-red-500" />
              Transparent pricing in INR
            </li>
            <li className="flex items-center gap-2">
              <Award className="h-4 w-4 text-red-500" />
              Convenient Civil Line, Lalitpur location
            </li>
            <li className="flex items-center gap-2">
              <Award className="h-4 w-4 text-red-500" />
              Friendly after-sales support
            </li>
          </ul>
        </div>
      </div>

      <EsteemedCustomersSection customers={esteemedCustomers} />
    </>
  );
}
