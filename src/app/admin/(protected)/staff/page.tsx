import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { StaffPanel } from "@/components/admin/StaffPanel";
import { requireAdminRole } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Staff",
};

type Props = {
  searchParams: Promise<{ role?: string }>;
};

export default async function AdminStaffPage({ searchParams }: Props) {
  const session = await requireAdminRole();
  if (!session) {
    redirect("/admin");
  }

  const { role } = await searchParams;

  return <StaffPanel defaultRoleFilter={role} />;
}
