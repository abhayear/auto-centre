"use client";

import { ServiceBooking, Service } from "@prisma/client";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Badge, statusBadgeVariant } from "@/components/ui/Badge";
import { Select } from "@/components/ui/Select";
import { formatDate } from "@/lib/utils";

type BookingWithService = ServiceBooking & { service: Service };

export default function AdminBookingsPage() {
  const [bookings, setBookings] = useState<BookingWithService[]>([]);
  const [filter, setFilter] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function load() {
      const url = filter ? `/api/bookings?status=${filter}` : "/api/bookings";
      const res = await fetch(url);
      const data = await res.json();
      if (active) {
        setBookings(data);
        setLoading(false);
      }
    }

    load();
    return () => {
      active = false;
    };
  }, [filter]);

  async function refreshBookings() {
    const url = filter ? `/api/bookings?status=${filter}` : "/api/bookings";
    const res = await fetch(url);
    setBookings(await res.json());
  }

  async function updateStatus(id: string, status: string) {
    const res = await fetch("/api/bookings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });

    if (res.ok) {
      toast.success("Status updated");
      refreshBookings();
    } else {
      toast.error("Failed to update status");
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-red-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-white">Bookings</h1>
        <div className="w-48">
          <Select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            options={[
              { value: "pending", label: "Pending" },
              { value: "confirmed", label: "Confirmed" },
              { value: "completed", label: "Completed" },
              { value: "cancelled", label: "Cancelled" },
            ]}
            placeholder="All Statuses"
          />
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-700/50">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-700 bg-slate-800/50">
            <tr>
              <th className="px-4 py-3 font-medium text-slate-300">Customer</th>
              <th className="px-4 py-3 font-medium text-slate-300">Area</th>
              <th className="px-4 py-3 font-medium text-slate-300">Service</th>
              <th className="px-4 py-3 font-medium text-slate-300">Date</th>
              <th className="px-4 py-3 font-medium text-slate-300">Status</th>
              <th className="px-4 py-3 font-medium text-slate-300">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700/50">
            {bookings.map((booking) => (
              <tr key={booking.id} className="hover:bg-slate-800/30">
                <td className="px-4 py-3">
                  <p className="text-white">{booking.customerName}</p>
                  <p className="text-xs text-slate-400">{booking.email}</p>
                </td>
                <td className="px-4 py-3 text-slate-300">
                  <p>{booking.customerArea}</p>
                  {booking.customerAddress && (
                    <p className="text-xs text-slate-500">{booking.customerAddress}</p>
                  )}
                </td>
                <td className="px-4 py-3 text-slate-300">
                  {booking.service.name}
                </td>
                <td className="px-4 py-3 text-slate-300">
                  {formatDate(booking.preferredDate)} at {booking.preferredTime}
                </td>
                <td className="px-4 py-3">
                  <Badge variant={statusBadgeVariant(booking.status)}>
                    {booking.status}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  <Select
                    value={booking.status}
                    onChange={(e) => updateStatus(booking.id, e.target.value)}
                    options={[
                      { value: "pending", label: "Pending" },
                      { value: "confirmed", label: "Confirmed" },
                      { value: "completed", label: "Completed" },
                      { value: "cancelled", label: "Cancelled" },
                    ]}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {bookings.length === 0 && (
          <p className="py-8 text-center text-slate-400">No bookings found.</p>
        )}
      </div>
    </div>
  );
}
