"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

type FieldErrors = Record<string, string>;

export function ChangePasswordForm() {
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setErrors({});

    const formData = new FormData(e.currentTarget);
    const payload = {
      currentPassword: formData.get("currentPassword") as string,
      newPassword: formData.get("newPassword") as string,
      confirmPassword: formData.get("confirmPassword") as string,
    };

    const res = await fetch("/api/admin/change-password", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      if (Array.isArray(data.details)) {
        const fieldErrors: FieldErrors = {};
        for (const item of data.details) {
          if (item.field) fieldErrors[item.field] = item.message;
        }
        setErrors(fieldErrors);
      }
      toast.error(data.error ?? "Failed to change password");
      return;
    }

    toast.success("Password updated successfully");
    e.currentTarget.reset();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="max-w-md space-y-4 rounded-xl border border-slate-700/50 bg-slate-800/30 p-6"
    >
      <Input
        id="currentPassword"
        name="currentPassword"
        type="password"
        label="Current password"
        autoComplete="current-password"
        required
        error={errors.currentPassword}
      />
      <Input
        id="newPassword"
        name="newPassword"
        type="password"
        label="New password"
        autoComplete="new-password"
        required
        error={errors.newPassword}
      />
      <Input
        id="confirmPassword"
        name="confirmPassword"
        type="password"
        label="Confirm new password"
        autoComplete="new-password"
        required
        error={errors.confirmPassword}
      />

      <Button type="submit" disabled={loading}>
        {loading ? "Updating…" : "Update password"}
      </Button>
    </form>
  );
}
