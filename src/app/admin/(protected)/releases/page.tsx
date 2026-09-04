import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ReleasesPanel } from "@/components/admin/ReleasesPanel";
import { canMergeReleases } from "@/lib/admin-roles";
import { requireStaffSession } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Releases",
};

export default async function ReleasesPage() {
  const session = await requireStaffSession();
  if (!session) {
    redirect("/admin/login");
  }

  return (
    <ReleasesPanel canMerge={canMergeReleases(session.user.role)} />
  );
}
