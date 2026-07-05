import Link from "next/link";
import Image from "next/image";
import { Vehicle } from "@prisma/client";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { DEFAULT_VEHICLE_IMAGE } from "@/lib/image-constants";
import { formatPrice, parseImages } from "@/lib/utils";

export function VehicleCard({ vehicle }: { vehicle: Vehicle }) {
  const images = parseImages(vehicle.images);
  const imageUrl = images[0] ?? DEFAULT_VEHICLE_IMAGE;
  const isLocalUpload = imageUrl.startsWith("/uploads/");

  return (
    <Link href={`/vehicles/${vehicle.id}`}>
      <Card className="group overflow-hidden transition-all hover:border-red-600/50 hover:shadow-lg hover:shadow-red-900/10">
        <div className="relative aspect-[16/10] overflow-hidden">
          <Image
            src={imageUrl}
            alt={`${vehicle.year} ${vehicle.make} ${vehicle.model}`}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            unoptimized={isLocalUpload}
          />
          {vehicle.featured && (
            <div className="absolute left-3 top-3">
              <Badge variant="danger">Featured</Badge>
            </div>
          )}
        </div>
        <div className="p-4">
          <div className="mb-2 flex items-start justify-between gap-2">
            <h3 className="font-semibold text-white">
              {vehicle.year} {vehicle.make} {vehicle.model}
            </h3>
            <Badge variant={vehicle.condition === "new" ? "success" : "default"}>
              {vehicle.condition}
            </Badge>
          </div>
          <p className="mb-3 text-2xl font-bold text-red-500">
            {formatPrice(vehicle.price)}
          </p>
          <div className="flex flex-wrap gap-3 text-xs text-slate-400">
            <span>{vehicle.mileage.toLocaleString("en-IN")} km</span>
            <span>{vehicle.fuelType}</span>
            <span>{vehicle.transmission}</span>
          </div>
        </div>
      </Card>
    </Link>
  );
}
