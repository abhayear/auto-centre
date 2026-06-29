import { BookingForm } from "@/components/forms/BookingForm";
import { prisma } from "@/lib/prisma";
import { safeDbQuery } from "@/lib/safe-db";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Book Service",
  description: "Schedule a service appointment for your electric 2-wheeler.",
};

export const dynamic = "force-dynamic";

export default async function BookServicePage() {
  const services = await safeDbQuery(
    () =>
      prisma.service.findMany({
        where: { active: true },
        orderBy: { createdAt: "desc" },
        select: { id: true, name: true },
      }),
    []
  );

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Book a Service</h1>
        <p className="mt-2 text-slate-400">
          Your location is used automatically to verify we can reach you for doorstep service.
        </p>
      </div>

      <div className="rounded-xl border border-slate-700/50 bg-slate-800/30 p-6">
        <BookingForm services={services} />
      </div>
    </div>
  );
}
