import { ChangePasswordForm } from "@/components/forms/ChangePasswordForm";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Change Password",
};

export default function AdminChangePasswordPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Change Password</h1>
        <p className="mt-1 text-sm text-slate-400">
          Update your admin login password. You must enter your current password to confirm.
        </p>
      </div>

      <ChangePasswordForm />
    </div>
  );
}
