"use client";

import { Car } from "lucide-react";
import { StaffSignInForm } from "@/components/auth/StaffSignInForm";
import { SITE_NAME } from "@/lib/constants";

export default function AdminLoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <Car className="mx-auto mb-4 h-10 w-10 text-red-500" />
          <h1 className="text-2xl font-bold text-white">{SITE_NAME}</h1>
          <p className="mt-1 text-sm text-slate-400">Staff sign in</p>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-xl">
          <StaffSignInForm defaultRole="admin" />
        </div>
      </div>
    </div>
  );
}
