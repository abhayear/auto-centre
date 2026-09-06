import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Activity,
  Briefcase,
  Car,
  Calendar,
  ClipboardList,
  Megaphone,
  MessageSquare,
  Package,
  Wrench,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import { requireStaffSession } from "@/lib/auth";
import { homeRedirectForRole } from "@/lib/portal-pages";
import { prisma } from "@/lib/prisma";
import { safeDbQuery } from "@/lib/safe-db";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const session = await requireStaffSession();
  if (!session) {
    redirect("/admin/login");
  }

  const role = session.user.role;
  const homeRedirect = homeRedirectForRole(role);
  if (homeRedirect) {
    redirect(homeRedirect);
  }

  const [
    vehicleCount,
    pendingBookings,
    newInquiries,
    serviceCount,
    openJobs,
    newApplications,
    pendingWarranty,
  ] = await Promise.all([
      safeDbQuery(() => prisma.vehicle.count({ where: { status: "available" } }), 0),
      safeDbQuery(() => prisma.serviceBooking.count({ where: { status: "pending" } }), 0),
      safeDbQuery(() => prisma.inquiry.count({ where: { status: "new" } }), 0),
      safeDbQuery(() => prisma.service.count({ where: { active: true } }), 0),
      safeDbQuery(
        () => prisma.jobPosting.count({ where: { status: "open", active: true } }),
        0,
      ),
      safeDbQuery(() => prisma.jobApplication.count({ where: { status: "new" } }), 0),
      safeDbQuery(
        () =>
          prisma.replacementClaim.count({
            where: { status: { notIn: ["returned_to_customer", "closed", "cancelled"] } },
          }),
        0,
      ),
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
    {
      label: "Open Positions",
      value: openJobs,
      icon: Briefcase,
      color: "text-purple-400",
    },
    {
      label: "New Applications",
      value: newApplications,
      icon: ClipboardList,
      color: "text-orange-400",
    },
    {
      label: "Warranty pending",
      value: pendingWarranty,
      icon: Package,
      color: "text-sky-400",
    },
  ];

  return (
    <div>
      <h1 className="mb-8 text-2xl font-bold text-white">Dashboard</h1>

      <Link
        href="/admin/cloud-vitals"
        className="mb-8 block rounded-xl border border-red-500/30 bg-red-950/20 p-5 transition-colors hover:border-red-500/50 hover:bg-red-950/30"
      >
        <div className="flex items-center gap-4">
          <div className="rounded-lg bg-red-600/20 p-3 text-red-400">
            <Activity className="h-6 w-6" />
          </div>
          <div>
            <p className="font-semibold text-white">Cloud Vitals</p>
            <p className="text-sm text-slate-400">
              Site health, traffic load, and performance — scale before heavy visits cause issues.
            </p>
          </div>
        </div>
      </Link>

      <Link
        href="/admin/offers"
        className="mb-8 block rounded-xl border border-amber-500/30 bg-amber-950/20 p-5 transition-colors hover:border-amber-500/50 hover:bg-amber-950/30"
      >
        <div className="flex items-center gap-4">
          <div className="rounded-lg bg-amber-600/20 p-3 text-amber-400">
            <Megaphone className="h-6 w-6" />
          </div>
          <div>
            <p className="font-semibold text-white">Offers and pricing</p>
            <p className="text-sm text-slate-400">
              Festival and monsoon homepage offers, plus suggested model prices from sold history.
            </p>
          </div>
        </div>
      </Link>

      <Link
        href="/admin/replacement-parts"
        className="mb-8 block rounded-xl border border-sky-500/30 bg-sky-950/20 p-5 transition-colors hover:border-sky-500/50 hover:bg-sky-950/30"
      >
        <div className="flex items-center gap-4">
          <div className="rounded-lg bg-sky-600/20 p-3 text-sky-400">
            <Package className="h-6 w-6" />
          </div>
          <div>
            <p className="font-semibold text-white">Replacement Parts</p>
            <p className="text-sm text-slate-400">
              Warranty cases: submit customers, send to Plant or Company, receive stock, and
              allocate. {pendingWarranty} pending.
            </p>
          </div>
        </div>
      </Link>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
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
