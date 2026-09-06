"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  Activity,
  Briefcase,
  BarChart3,
  Calendar,
  CalendarClock,
  Car,
  ClipboardList,
  Clock,
  FileSpreadsheet,
  GitBranch,
  GitCompare,
  GraduationCap,
  IndianRupee,
  KeyRound,
  LayoutDashboard,
  ListChecks,
  LogOut,
  MapPin,
  Megaphone,
  MessageSquare,
  Package,
  Star,
  Store,
  UserCog,
  Wrench,
} from "lucide-react";
import { signOut } from "next-auth/react";
import { GSTR1_CONSOLIDATOR_URL, GST_ITC_MATCHER_URL, ONLINE_STORE_URL, SITE_NAME } from "@/lib/constants";
import {
  canAssignWork,
  canEditTraining,
  canReadTraining,
  canUseOpsPortal,
  canViewReleases,
  isAdminRole,
  isStaffRole,
  type StaffRole,
} from "@/lib/admin-roles";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import type { LucideIcon } from "lucide-react";

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  show: (role: StaffRole) => boolean;
  external?: boolean;
};

function canAccessTraining(role: StaffRole): boolean {
  return (
    canEditTraining(role) ||
    canReadTraining(role, "sales") ||
    canReadTraining(role, "mechanic") ||
    canReadTraining(role, "manager")
  );
}

function panelSubtitle(role: StaffRole): string {
  const labels: Record<StaffRole, string> = {
    admin: "Admin Panel",
    manager: "Manager Panel",
    senior_developer: "Senior Developer",
    junior_developer: "Junior Developer",
    sales: "Sales Training",
    mechanic: "Mechanic Training",
  };
  return labels[role];
}

const navItems: NavItem[] = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, show: canUseOpsPortal },
  { href: "/admin/cloud-vitals", label: "Cloud Vitals", icon: Activity, show: canUseOpsPortal },
  { href: "/admin/training", label: "Training", icon: GraduationCap, show: canAccessTraining },
  { href: "/admin/work", label: "Work", icon: ListChecks, show: (role) => canAssignWork(role) || role === "junior_developer" },
  { href: "/admin/releases", label: "Releases", icon: GitBranch, show: canViewReleases },
  { href: "/admin/vehicles", label: "Vehicles", icon: Car, show: canUseOpsPortal },
  { href: "/admin/offers", label: "Offers & pricing", icon: Megaphone, show: canUseOpsPortal },
  { href: "/admin/bookings", label: "Bookings", icon: Calendar, show: canUseOpsPortal },
  { href: "/admin/cash-box", label: "Cash Box", icon: IndianRupee, show: canUseOpsPortal },
  { href: "/admin/inquiries", label: "Inquiries", icon: MessageSquare, show: canUseOpsPortal },
  { href: "/admin/showroom-walk-ins", label: "Walk-in Enquiries", icon: Store, show: canUseOpsPortal },
  { href: "/admin/replacement-parts", label: "Replacement Warranty", icon: Package, show: canUseOpsPortal },
  { href: "/admin/esteemed-customers", label: "Esteemed Customers", icon: Star, show: canUseOpsPortal },
  { href: "/admin/site-analytics", label: "Site Analytics", icon: BarChart3, show: canUseOpsPortal },
  { href: "/admin/services", label: "Services", icon: Wrench, show: canUseOpsPortal },
  { href: "/admin/service-areas", label: "Service Areas", icon: MapPin, show: canUseOpsPortal },
  { href: "/admin/site-settings", label: "Site Settings", icon: Clock, show: canUseOpsPortal },
  { href: ONLINE_STORE_URL, label: "Online Store", icon: Store, external: true, show: canUseOpsPortal },
  { href: GSTR1_CONSOLIDATOR_URL, label: "GSTR-1", icon: FileSpreadsheet, external: true, show: canUseOpsPortal },
  { href: GST_ITC_MATCHER_URL, label: "GST ITC Matcher", icon: GitCompare, external: true, show: canUseOpsPortal },
  { href: "/admin/service-schedule", label: "Service Schedule", icon: CalendarClock, show: canUseOpsPortal },
  { href: "/admin/jobs", label: "Job Postings", icon: Briefcase, show: canUseOpsPortal },
  { href: "/admin/job-applications", label: "Applicant Tracking", icon: ClipboardList, show: canUseOpsPortal },
  { href: "/admin/staff", label: "Staff", icon: UserCog, show: isAdminRole },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const role = session?.user?.role;
  const staffRole = role && isStaffRole(role) ? role : null;

  const visibleNavItems = staffRole
    ? navItems.filter((item) => item.show(staffRole))
    : [];

  return (
    <aside className="flex w-64 shrink-0 flex-col border-r border-slate-800 bg-slate-950 print:hidden">
      <div className="border-b border-slate-800 px-6 py-5">
        <Link href="/admin" className="text-lg font-bold text-white">
          {SITE_NAME}
        </Link>
        <p className="text-xs text-slate-500">
          {staffRole ? panelSubtitle(staffRole) : "Staff Portal"}
        </p>
      </div>

      <nav className="flex-1 space-y-1 p-4">
        {visibleNavItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            item.href === "/admin"
              ? pathname === "/admin"
              : pathname.startsWith(item.href);

          const className = cn(
            "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
            isActive
              ? "bg-red-600/20 text-red-400"
              : "text-slate-400 hover:bg-slate-800 hover:text-white"
          );

          if (item.external) {
            return (
              <a
                key={item.href}
                href={item.href}
                target="_blank"
                rel="noopener noreferrer"
                className={className}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </a>
            );
          }

          return (
            <Link key={item.href} href={item.href} className={className}>
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-slate-800 p-4 space-y-1">
        <Link
          href="/admin/change-password"
          className={cn(
            "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
            pathname === "/admin/change-password"
              ? "bg-red-600/20 text-red-400"
              : "text-slate-400 hover:bg-slate-800 hover:text-white"
          )}
        >
          <KeyRound className="h-4 w-4" />
          Change Password
        </Link>
        <Button
          variant="ghost"
          className="w-full justify-start"
          onClick={async () => {
            await signOut({ redirect: false });
            window.location.href = "/";
          }}
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </Button>
      </div>
    </aside>
  );
}
