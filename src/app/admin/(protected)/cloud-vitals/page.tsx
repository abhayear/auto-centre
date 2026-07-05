import { redirect } from "next/navigation";
import AdminCloudVitalsPage from "./AdminCloudVitalsPage";
import { requireAdmin } from "@/lib/auth";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Cloud Vitals",
};

export default async function CloudVitalsPage() {
  const session = await requireAdmin();
  if (!session) {
    redirect("/admin/login");
  }

  return <AdminCloudVitalsPage />;
}
