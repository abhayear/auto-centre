import { Lock } from "lucide-react";
import { StaffSignInForm } from "@/components/auth/StaffSignInForm";

export function StaffPortalSection() {
  return (
    <section className="border-t border-slate-800 bg-slate-950/80">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-md">
          <div className="mb-6 text-center">
            <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-red-600/20">
              <Lock className="h-5 w-5 text-red-500" />
            </div>
            <h2 className="text-xl font-bold text-white">Staff portal</h2>
            <p className="mt-1 text-sm text-slate-400">
              Admin and manager sign-in for website updates
            </p>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-xl">
            <StaffSignInForm defaultRole="manager" />
          </div>
        </div>
      </div>
    </section>
  );
}
