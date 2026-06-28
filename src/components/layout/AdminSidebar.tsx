"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Briefcase,
  Calendar,
  CalendarClock,
  Car,
  ClipboardList,
  Clock,
  LayoutDashboard,
  LogOut,
  MapPin,
  MessageSquare,
  Star,
  Wrench,
} from "lucide-react";
import { signOut } from "next-auth/react";
import { SITE_NAME } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";

const navItems = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/vehicles", label: "Vehicles", icon: Car },
  { href: "/admin/bookings", label: "Bookings", icon: Calendar },
  { href: "/admin/inquiries", label: "Inquiries", icon: MessageSquare },
  { href: "/admin/esteemed-customers", label: "Esteemed Customers", icon: Star },
  { href: "/admin/services", label: "Services", icon: Wrench },
  { href: "/admin/service-areas", label: "Service Areas", icon: MapPin },
  { href: "/admin/site-settings", label: "Site Settings", icon: Clock },
  { href: "/admin/service-schedule", label: "Service Schedule", icon: CalendarClock },
  { href: "/admin/jobs", label: "Job Postings", icon: Briefcase },
  { href: "/admin/job-applications", label: "Applications", icon: ClipboardList },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex w-64 shrink-0 flex-col border-r border-slate-800 bg-slate-950">
      <div className="border-b border-slate-800 px-6 py-5">
        <Link href="/admin" className="text-lg font-bold text-white">
          {SITE_NAME}
        </Link>
        <p className="text-xs text-slate-500">Admin Panel</p>
      </div>

      <nav className="flex-1 space-y-1 p-4">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            item.href === "/admin"
              ? pathname === "/admin"
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-red-600/20 text-red-400"
                  : "text-slate-400 hover:bg-slate-800 hover:text-white"
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-slate-800 p-4">
        <Button
          variant="ghost"
          className="w-full justify-start"
          onClick={() => signOut({ callbackUrl: "/admin/login" })}
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </Button>
      </div>
    </aside>
  );
}
