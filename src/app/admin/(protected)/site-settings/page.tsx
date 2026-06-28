import { SiteSettingsForm } from "@/components/forms/SiteSettingsForm";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Site Settings",
};

export default function AdminSiteSettingsPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Site Settings</h1>
        <p className="mt-1 text-sm text-slate-400">
          Manage business hours and public notices shown on the website.
        </p>
      </div>

      <SiteSettingsForm />
    </div>
  );
}
