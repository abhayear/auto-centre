import Link from "next/link";
import Image from "next/image";
import { Vehicle } from "@prisma/client";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { formatPrice, parseImages } from "@/lib/utils";

export function VehicleCard({ vehicle }: { vehicle: Vehicle }) {
  const images = parseImages(vehicle.images);
  const imageUrl = images[0] ?? "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=800&q=80";

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
            <span>{vehicle.mileage.toLocaleString()} mi</span>
            <span>{vehicle.fuelType}</span>
            <span>{vehicle.transmission}</span>
          </div>
        </div>
      </Card>
    </Link>
  );
}
