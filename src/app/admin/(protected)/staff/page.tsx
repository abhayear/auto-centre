import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { StaffPanel } from "@/components/admin/StaffPanel";
import { requireStaffSession } from "@/lib/auth";
import { canAppointStaff } from "@/lib/admin-roles";

export const metadata: Metadata = {
  title: "Staff",
};

type Props = {
  searchParams: Promise<{ role?: string }>;
};

export default async function AdminStaffPage({ searchParams }: Props) {
  const session = await requireStaffSession();
  if (!session || !canAppointStaff(session.user.role)) {
    redirect("/admin");
  }

  const { role } = await searchParams;

  return <StaffPanel defaultRoleFilter={role} />;
}
