import Link from "next/link";
import { Clock, Wrench } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { formatPrice } from "@/lib/utils";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Services",
  description: "Professional automotive services and maintenance.",
};

export default async function ServicesPage() {
  const services = await prisma.service.findMany({
    where: { active: true },
    orderBy: { name: "asc" },
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-10">
        <h1 className="text-3xl font-bold text-white">Our Services</h1>
        <p className="mt-2 text-slate-400">
          Expert maintenance and repair services for all makes and models.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {services.map((service) => (
          <div
            key={service.id}
            className="rounded-xl border border-slate-700/50 bg-slate-800/30 p-6"
          >
            <div className="mb-4 flex items-start justify-between">
              <Wrench className="h-6 w-6 text-red-500" />
              <span className="text-lg font-bold text-red-400">
                {formatPrice(service.estimatedPrice)}
              </span>
            </div>
            <h2 className="text-xl font-semibold text-white">{service.name}</h2>
            <p className="mt-2 text-slate-400">{service.description}</p>
            <div className="mt-4 flex items-center gap-2 text-sm text-slate-500">
              <Clock className="h-4 w-4" />
              ~{service.durationMinutes} minutes
            </div>
          </div>
        ))}
      </div>

      <div className="mt-12 rounded-xl bg-gradient-to-r from-red-600/20 to-red-700/10 border border-red-600/30 p-8 text-center">
        <h2 className="text-xl font-bold text-white">Ready to book?</h2>
        <p className="mt-2 text-slate-400">
          Schedule your service appointment online in minutes.
        </p>
        <Link
          href="/book-service"
          className="mt-4 inline-block rounded-lg bg-red-600 px-6 py-3 font-medium text-white hover:bg-red-700"
        >
          Book Service
        </Link>
      </div>
    </div>
  );
}
