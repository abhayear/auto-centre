import type { IndianSeason } from "@/lib/indian-seasons";

export type PricedVehicle = {
  id: string;
  make: string;
  model: string;
  year: number;
  price: number;
  status: string;
};

export type PriceSuggestion = {
  id: string;
  make: string;
  model: string;
  year: number;
  currentPrice: number;
  suggestedPrice: number;
  soldSampleSize: number;
  soldAverage: number | null;
  deltaAmount: number;
  reason: string;
};

function modelKey(make: string, model: string): string {
  return `${make.trim().toLowerCase()}|${model.trim().toLowerCase()}`;
}

export function roundInr(amount: number): number {
  return Math.max(100, Math.round(amount / 100) * 100);
}

export function suggestPrice(
  currentPrice: number,
  soldAverage: number | null,
  season: IndianSeason,
): number {
  const base = soldAverage && soldAverage > 0 ? soldAverage : currentPrice;
  const raw = base * (1 + season.priceDelta);
  const clamped = Math.min(currentPrice * 1.25, Math.max(currentPrice * 0.75, raw));
  return roundInr(clamped);
}

export function buildPriceSuggestions(
  vehicles: PricedVehicle[],
  season: IndianSeason,
): PriceSuggestion[] {
  const soldAverages = new Map<string, { total: number; count: number }>();

  for (const vehicle of vehicles) {
    if (vehicle.status !== "sold") continue;
    const key = modelKey(vehicle.make, vehicle.model);
    const entry = soldAverages.get(key) ?? { total: 0, count: 0 };
    entry.total += vehicle.price;
    entry.count += 1;
    soldAverages.set(key, entry);
  }

  return vehicles
    .filter((vehicle) => vehicle.status === "available")
    .map((vehicle) => {
      const key = modelKey(vehicle.make, vehicle.model);
      const sold = soldAverages.get(key);
      const soldAverage = sold ? sold.total / sold.count : null;
      const suggestedPrice = suggestPrice(vehicle.price, soldAverage, season);
      const historyBit = soldAverage
        ? `Sold-average for ${vehicle.make} ${vehicle.model} is ₹${roundInr(soldAverage)} from ${sold.count} sale${sold.count === 1 ? "" : "s"}.`
        : "No sold units of this model yet — suggestion uses the current list price.";

      return {
        id: vehicle.id,
        make: vehicle.make,
        model: vehicle.model,
        year: vehicle.year,
        currentPrice: vehicle.price,
        suggestedPrice,
        soldSampleSize: sold?.count ?? 0,
        soldAverage: soldAverage ? roundInr(soldAverage) : null,
        deltaAmount: suggestedPrice - vehicle.price,
        reason: `${season.reason} ${historyBit}`,
      };
    });
}
