import { EsteemedCustomer } from "@prisma/client";
import { MapPin, Star, Zap } from "lucide-react";

export function EsteemedCustomersSection({
  customers,
}: {
  customers: EsteemedCustomer[];
}) {
  if (customers.length === 0) return null;

  return (
    <section className="border-y border-slate-800 bg-slate-950/50">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="mb-10 text-center">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-amber-600/30 bg-amber-950/40 px-3 py-1 text-sm text-amber-300">
            <Star className="h-4 w-4" />
            Trusted by riders across Lalitpur
          </div>
          <h2 className="text-2xl font-bold text-white sm:text-3xl">Our Esteemed Customers</h2>
          <p className="mt-2 text-slate-400">
            Families, professionals, and businesses who choose Auto Galaxy for electric mobility.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {customers.map((customer) => (
            <article
              key={customer.id}
              className="rounded-xl border border-slate-700/50 bg-slate-800/30 p-6"
            >
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-600/15 text-lg font-bold text-red-400">
                {customer.name.charAt(0).toUpperCase()}
              </div>
              <h3 className="text-lg font-semibold text-white">{customer.name}</h3>
              {customer.designation && (
                <p className="mt-1 text-sm font-medium text-red-300">{customer.designation}</p>
              )}
              <div className="mt-3 space-y-2 text-sm text-slate-400">
                {customer.locality && (
                  <p className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 shrink-0 text-red-500" />
                    {customer.locality}
                  </p>
                )}
                {customer.vehicle && (
                  <p className="flex items-center gap-2">
                    <Zap className="h-4 w-4 shrink-0 text-red-500" />
                    {customer.vehicle}
                  </p>
                )}
              </div>
              {customer.note && (
                <p className="mt-4 border-t border-slate-700/50 pt-4 text-sm italic text-slate-300">
                  &ldquo;{customer.note}&rdquo;
                </p>
              )}
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
