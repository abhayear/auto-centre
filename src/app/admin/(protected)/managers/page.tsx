import { redirect } from "next/navigation";
import { ManagersPanel } from "@/components/admin/ManagersPanel";
import { requireAdminRole } from "@/lib/auth";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Managers",
};

export default async function AdminManagersPage() {
  const session = await requireAdminRole();
  if (!session) {
    redirect("/admin");
  }

  return <ManagersPanel />;
}
