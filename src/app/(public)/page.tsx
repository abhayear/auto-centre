import Link from "next/link";
import { ArrowRight, Battery, Shield, Wrench, Zap } from "lucide-react";
import { EsteemedCustomersSection } from "@/components/customers/EsteemedCustomersSection";
import { VisitorCountBadge } from "@/components/home/VisitorCountBadge";
import { VehicleGrid } from "@/components/vehicles/VehicleGrid";
import { SITE_DESCRIPTION, SITE_NAME } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { formatPrice } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [featuredVehicles, services, esteemedCustomers] = await Promise.all([
    prisma.vehicle.findMany({
      where: { featured: true, status: "available" },
      take: 3,
      orderBy: { createdAt: "desc" },
    }),
    prisma.service.findMany({
      where: { active: true },
      orderBy: { createdAt: "desc" },
      take: 4,
    }),
    prisma.esteemedCustomer.findMany({
      where: { active: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    }),
  ]);

  return (
    <>
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-900 to-red-950/30">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1920&q=80')] bg-cover bg-center opacity-15" />
        <div className="relative mx-auto max-w-7xl px-4 py-24 sm:px-6 sm:py-32 lg:px-8">
          <div className="max-w-2xl">
            <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl">
              Go Electric with{" "}
              <span className="text-red-500">{SITE_NAME}</span>
            </h1>
            <p className="mt-6 text-lg text-slate-300">{SITE_DESCRIPTION}</p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link
                href="/vehicles"
                className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-6 py-3 font-medium text-white transition-colors hover:bg-red-700"
              >
                Browse E-Scooters
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/book-service"
                className="inline-flex items-center gap-2 rounded-lg border border-slate-600 px-6 py-3 font-medium text-white transition-colors hover:bg-slate-800"
              >
                Book Service
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="mb-10 flex items-end justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white sm:text-3xl">
              Featured E-Scooters
            </h2>
            <p className="mt-2 text-slate-400">
              Top electric 2-wheelers from leading brands
            </p>
          </div>
          <Link
            href="/vehicles"
            className="hidden text-sm font-medium text-red-400 hover:text-red-300 sm:block"
          >
            View all →
          </Link>
        </div>
        <VehicleGrid vehicles={featuredVehicles} />
      </section>

      <section className="border-y border-slate-800 bg-slate-950/50">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="mb-10 text-center">
            <h2 className="text-2xl font-bold text-white sm:text-3xl">
              Our Services
            </h2>
            <p className="mt-2 text-slate-400">
              Expert electric 2-wheeler sales and service in Lalitpur
            </p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {services.map((service) => (
              <div
                key={service.id}
                className="rounded-xl border border-slate-700/50 bg-slate-800/30 p-6"
              >
                <Wrench className="mb-3 h-6 w-6 text-red-500" />
                <h3 className="font-semibold text-white">{service.name}</h3>
                <p className="mt-2 line-clamp-2 text-sm text-slate-400">
                  {service.description}
                </p>
                <p className="mt-3 text-lg font-bold text-red-400">
                  From {formatPrice(service.estimatedPrice)}
                </p>
              </div>
            ))}
          </div>
          <div className="mt-8 text-center">
            <Link
              href="/services"
              className="text-sm font-medium text-red-400 hover:text-red-300"
            >
              View all services →
            </Link>
          </div>
        </div>
      </section>

      <EsteemedCustomersSection customers={esteemedCustomers} />

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-8 md:grid-cols-3">
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-600/20">
              <Zap className="h-6 w-6 text-red-500" />
            </div>
            <h3 className="font-semibold text-white">Electric 2-Wheelers</h3>
            <p className="mt-2 text-sm text-slate-400">
              New and pre-owned e-scooters from Ola, Ather, TVS, Bajaj, and more.
            </p>
          </div>
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-600/20">
              <Battery className="h-6 w-6 text-red-500" />
            </div>
            <h3 className="font-semibold text-white">Battery & Motor Care</h3>
            <p className="mt-2 text-sm text-slate-400">
              Specialized diagnostics and service for electric drivetrains and batteries.
            </p>
          </div>
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-600/20">
              <Shield className="h-6 w-6 text-red-500" />
            </div>
            <h3 className="font-semibold text-white">Trusted in Lalitpur</h3>
            <p className="mt-2 text-sm text-slate-400">
              Civil Line, near Government ITI College — honest advice and after-sales support.
            </p>
          </div>
        </div>
      </section>

      <section className="bg-gradient-to-r from-red-600 to-red-700">
        <div className="mx-auto max-w-7xl px-4 py-12 text-center sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-white">
            Ready for a Test Ride?
          </h2>
          <p className="mt-2 text-red-100">
            Experience your next e-scooter on the road. Book a ride today.
          </p>
          <Link
            href="/test-drive"
            className="mt-6 inline-block rounded-lg bg-white px-6 py-3 font-medium text-red-600 transition-colors hover:bg-red-50"
          >
            Request Test Ride
          </Link>
        </div>
      </section>

      <section className="border-t border-slate-800 bg-slate-950 py-8">
        <div className="mx-auto flex max-w-7xl justify-center px-4 sm:px-6 lg:px-8">
          <VisitorCountBadge />
        </div>
      </section>
    </>
  );
}
