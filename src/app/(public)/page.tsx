import Link from "next/link";
import { ArrowRight, Shield, Star, Wrench } from "lucide-react";
import { VehicleGrid } from "@/components/vehicles/VehicleGrid";
import { SITE_DESCRIPTION, SITE_NAME } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { formatPrice } from "@/lib/utils";

export default async function HomePage() {
  const [featuredVehicles, services] = await Promise.all([
    prisma.vehicle.findMany({
      where: { featured: true, status: "available" },
      take: 3,
      orderBy: { createdAt: "desc" },
    }),
    prisma.service.findMany({
      where: { active: true },
      take: 4,
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <>
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-900 to-red-950/30">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=1920&q=80')] bg-cover bg-center opacity-10" />
        <div className="relative mx-auto max-w-7xl px-4 py-24 sm:px-6 sm:py-32 lg:px-8">
          <div className="max-w-2xl">
            <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl">
              Drive Your Dreams at{" "}
              <span className="text-red-500">{SITE_NAME}</span>
            </h1>
            <p className="mt-6 text-lg text-slate-300">{SITE_DESCRIPTION}</p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link
                href="/vehicles"
                className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-6 py-3 font-medium text-white transition-colors hover:bg-red-700"
              >
                Browse Inventory
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
              Featured Vehicles
            </h2>
            <p className="mt-2 text-slate-400">
              Hand-picked selections from our premium inventory
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
              Expert care to keep your vehicle running at its best
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

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-8 md:grid-cols-3">
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-600/20">
              <Star className="h-6 w-6 text-red-500" />
            </div>
            <h3 className="font-semibold text-white">Premium Selection</h3>
            <p className="mt-2 text-sm text-slate-400">
              Curated inventory of new and pre-owned vehicles from top brands.
            </p>
          </div>
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-600/20">
              <Wrench className="h-6 w-6 text-red-500" />
            </div>
            <h3 className="font-semibold text-white">Expert Service</h3>
            <p className="mt-2 text-sm text-slate-400">
              Certified technicians using the latest diagnostic equipment.
            </p>
          </div>
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-600/20">
              <Shield className="h-6 w-6 text-red-500" />
            </div>
            <h3 className="font-semibold text-white">Trusted Experience</h3>
            <p className="mt-2 text-sm text-slate-400">
              Transparent pricing and dedicated support every step of the way.
            </p>
          </div>
        </div>
      </section>

      <section className="bg-gradient-to-r from-red-600 to-red-700">
        <div className="mx-auto max-w-7xl px-4 py-12 text-center sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-white">
            Ready for a Test Drive?
          </h2>
          <p className="mt-2 text-red-100">
            Experience your next vehicle firsthand. Schedule today.
          </p>
          <Link
            href="/test-drive"
            className="mt-6 inline-block rounded-lg bg-white px-6 py-3 font-medium text-red-600 transition-colors hover:bg-red-50"
          >
            Request Test Drive
          </Link>
        </div>
      </section>
    </>
  );
}
