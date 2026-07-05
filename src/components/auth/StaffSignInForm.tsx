"use client";

import { getSession, signIn, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import type { StaffRole } from "@/lib/admin-roles";
import { cn } from "@/lib/utils";

type Props = {
  defaultRole?: StaffRole;
  className?: string;
  compact?: boolean;
};

const roleOptions: { value: StaffRole; label: string; description: string }[] = [
  {
    value: "admin",
    label: "Admin",
    description: "Full access including managers and system tools",
  },
  {
    value: "manager",
    label: "Manager",
    description: "Update vehicles, services, bookings, and site content",
  },
];

export function StaffSignInForm({
  defaultRole = "manager",
  className,
  compact = false,
}: Props) {
  const router = useRouter();
  const [role, setRole] = useState<StaffRole>(defaultRole);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (result?.error) {
      setLoading(false);
      toast.error("Invalid email or password");
      return;
    }

    const session = await getSession();
    const actualRole = session?.user?.role ?? "admin";

    if (actualRole !== role) {
      await signOut({ redirect: false });
      setLoading(false);
      toast.error(
        `These credentials are for ${actualRole === "admin" ? "Admin" : "Manager"}. Select the correct portal above.`,
      );
      return;
    }

    setLoading(false);
    toast.success(`Welcome back, ${role === "admin" ? "Admin" : "Manager"}!`);
    router.push("/admin");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className={cn("space-y-4", className)}>
      <fieldset>
        <legend className="mb-2 text-sm font-medium text-slate-300">Sign in as</legend>
        <div className={cn("grid gap-2", compact ? "sm:grid-cols-2" : "grid-cols-1 sm:grid-cols-2")}>
          {roleOptions.map((option) => {
            const id = `staff-role-${option.value}`;
            const selected = role === option.value;

            return (
              <label
                key={option.value}
                htmlFor={id}
                className={cn(
                  "flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-3 transition-colors",
                  selected
                    ? "border-red-500/60 bg-red-600/10"
                    : "border-slate-700 bg-slate-900/50 hover:border-slate-600",
                )}
              >
                <input
                  id={id}
                  type="radio"
                  name="staffRole"
                  value={option.value}
                  checked={selected}
                  onChange={() => setRole(option.value)}
                  className="mt-1 border-slate-600 bg-slate-800 text-red-600 focus:ring-red-500"
                />
                <span>
                  <span className="block text-sm font-medium text-white">{option.label}</span>
                  {!compact ? (
                    <span className="mt-0.5 block text-xs text-slate-400">{option.description}</span>
                  ) : null}
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <Input
        id="staff-email"
        name="email"
        type="email"
        label="Email"
        required
        autoComplete="email"
      />
      <Input
        id="staff-password"
        name="password"
        type="password"
        label="Password"
        required
        autoComplete="current-password"
      />

      <Button type="submit" loading={loading} className="w-full">
        Sign in to {role === "admin" ? "Admin" : "Manager"} portal
      </Button>
    </form>
  );
}
