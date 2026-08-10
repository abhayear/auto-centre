import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge, statusBadgeVariant } from "@/components/ui/Badge";
import { InquiryForm } from "@/components/forms/InquiryForm";
import { prisma } from "@/lib/prisma";
import { DEFAULT_VEHICLE_IMAGE } from "@/lib/image-constants";
import { safeDbQuery } from "@/lib/safe-db";
import { formatPrice, parseImages } from "@/lib/utils";
import type { Metadata } from "next";

type PageProps = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const vehicle = await safeDbQuery(
    () => prisma.vehicle.findUnique({ where: { id } }),
    null
  );
  if (!vehicle) return { title: "Vehicle Not Found" };
  return {
    title: `${vehicle.year} ${vehicle.make} ${vehicle.model}`,
    description: vehicle.description.slice(0, 160),
  };
}

export default async function VehicleDetailPage({ params }: PageProps) {
  const { id } = await params;
  const vehicle = await safeDbQuery(
    () => prisma.vehicle.findUnique({ where: { id } }),
    null
  );

  if (!vehicle) notFound();

  const images = parseImages(vehicle.images);
  const mainImage = images[0] ?? DEFAULT_VEHICLE_IMAGE;
  const isLocalUpload = (url: string) => url.startsWith("/uploads/");

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <Link href="/vehicles" className="mb-6 inline-block text-sm text-red-400 hover:text-red-300">
        ← Back to inventory
      </Link>

      <div className="grid gap-10 lg:grid-cols-2">
        <div>
          <div className="relative aspect-[16/10] overflow-hidden rounded-xl">
            <Image
              src={mainImage}
              alt={`${vehicle.year} ${vehicle.make} ${vehicle.model}`}
              fill
              className="object-cover"
              priority
              sizes="(max-width: 1024px) 100vw, 50vw"
              unoptimized={isLocalUpload(mainImage)}
            />
          </div>
          {images.length > 1 && (
            <div className="mt-4 grid grid-cols-4 gap-2">
              {images.slice(1, 5).map((img, i) => (
                <div key={i} className="relative aspect-[16/10] overflow-hidden rounded-lg">
                  <Image
                    src={img}
                    alt=""
                    fill
                    className="object-cover"
                    sizes="150px"
                    unoptimized={isLocalUpload(img)}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <Badge variant={vehicle.condition === "new" ? "success" : "default"}>
              {vehicle.condition}
            </Badge>
            <Badge variant={statusBadgeVariant(vehicle.status)}>
              {vehicle.status}
            </Badge>
            {vehicle.featured && <Badge variant="danger">Featured</Badge>}
          </div>

          <h1 className="text-3xl font-bold text-white">
            {vehicle.year} {vehicle.make} {vehicle.model}
          </h1>
          <p className="mt-2 text-3xl font-bold text-red-500">
            {formatPrice(vehicle.price)}
          </p>

          <div className="mt-6 grid grid-cols-2 gap-4 rounded-xl border border-slate-700/50 bg-slate-800/30 p-4 sm:grid-cols-3">
            <div>
              <p className="text-xs text-slate-500">Mileage</p>
              <p className="font-medium text-white">{vehicle.mileage.toLocaleString("en-IN")} km</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Fuel</p>
              <p className="font-medium text-white">{vehicle.fuelType}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Transmission</p>
              <p className="font-medium text-white">{vehicle.transmission}</p>
            </div>
          </div>

          <div className="mt-6">
            <h2 className="mb-2 font-semibold text-white">Description</h2>
            <p className="text-slate-300 leading-relaxed">{vehicle.description}</p>
          </div>

          {vehicle.status === "available" && (
            <div className="mt-8 rounded-xl border border-slate-700/50 bg-slate-800/30 p-6">
              {vehicle.onlineBookingAmount != null && vehicle.onlineBookingAmount > 0 && (
                <div className="mb-4 rounded-lg border border-amber-700/50 bg-amber-900/20 px-4 py-3">
                  <p className="font-medium text-amber-200">
                    Online booking payment: {formatPrice(vehicle.onlineBookingAmount)}
                  </p>
                </div>
              )}
              {vehicle.onlineBookingRefund != null && vehicle.onlineBookingRefund > 0 && (
                <div className="mb-4 rounded-lg border border-green-700/50 bg-green-900/20 px-4 py-3">
                  <p className="font-medium text-green-300">
                    Book this e-scooter online & get {formatPrice(vehicle.onlineBookingRefund)}{" "}
                    cash refund from Auto Galaxy
                  </p>
                </div>
              )}
              <h2 className="mb-4 text-lg font-semibold text-white">Book Online</h2>
              <InquiryForm
                type="test_drive"
                vehicleId={vehicle.id}
                vehicleLabel={`${vehicle.year} ${vehicle.make} ${vehicle.model}`}
                onlineBookingRefund={vehicle.onlineBookingRefund}
                onlineBookingAmount={vehicle.onlineBookingAmount}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
