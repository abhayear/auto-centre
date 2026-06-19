import { Car, Calendar, MessageSquare, Wrench } from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import { prisma } from "@/lib/prisma";

export default async function AdminDashboardPage() {
  const [vehicleCount, pendingBookings, newInquiries, serviceCount] =
    await Promise.all([
      prisma.vehicle.count({ where: { status: "available" } }),
      prisma.serviceBooking.count({ where: { status: "pending" } }),
      prisma.inquiry.count({ where: { status: "new" } }),
      prisma.service.count({ where: { active: true } }),
    ]);

  const stats = [
    {
      label: "Available Vehicles",
      value: vehicleCount,
      icon: Car,
      color: "text-blue-400",
    },
    {
      label: "Pending Bookings",
      value: pendingBookings,
      icon: Calendar,
      color: "text-yellow-400",
    },
    {
      label: "New Inquiries",
      value: newInquiries,
      icon: MessageSquare,
      color: "text-green-400",
    },
    {
      label: "Active Services",
      value: serviceCount,
      icon: Wrench,
      color: "text-red-400",
    },
  ];

  return (
    <div>
      <h1 className="mb-8 text-2xl font-bold text-white">Dashboard</h1>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label}>
              <CardContent className="flex items-center gap-4">
                <div className={`rounded-lg bg-slate-700/50 p-3 ${stat.color}`}>
                  <Icon className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm text-slate-400">{stat.label}</p>
                  <p className="text-2xl font-bold text-white">{stat.value}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
