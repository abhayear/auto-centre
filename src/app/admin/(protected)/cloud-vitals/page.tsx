import { redirect } from "next/navigation";
import AdminCloudVitalsPage from "./AdminCloudVitalsPage";
import { requireAdminRole } from "@/lib/auth";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Cloud Vitals",
};

export default async function CloudVitalsPage() {
  const session = await requireAdminRole();
  if (!session) {
    redirect("/admin");
  }

  return <AdminCloudVitalsPage />;
}
