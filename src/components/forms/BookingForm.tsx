"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";

interface Service {
  id: string;
  name: string;
}

export function BookingForm({ services }: { services: Service[] }) {
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setErrors({});

    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());

    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await res.json();

      if (!res.ok) {
        if (result.details?.issues) {
          const fieldErrors: Record<string, string> = {};
          for (const issue of result.details.issues) {
            const path = issue.path?.[0];
            if (path) fieldErrors[path] = issue.message;
          }
          setErrors(fieldErrors);
        } else {
          toast.error(result.error ?? "Failed to submit booking");
        }
        return;
      }

      toast.success("Service booking submitted! We'll contact you soon.");
      (e.target as HTMLFormElement).reset();
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          id="customerName"
          name="customerName"
          label="Full Name"
          required
          error={errors.customerName}
        />
        <Input
          id="email"
          name="email"
          type="email"
          label="Email"
          required
          error={errors.email}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          id="phone"
          name="phone"
          type="tel"
          label="Phone"
          required
          error={errors.phone}
        />
        <Input
          id="vehicleInfo"
          name="vehicleInfo"
          label="Vehicle (Make/Model/Year)"
          placeholder="e.g. Toyota Camry 2020"
          required
          error={errors.vehicleInfo}
        />
      </div>
      <Select
        id="serviceId"
        name="serviceId"
        label="Service"
        required
        options={services.map((s) => ({ value: s.id, label: s.name }))}
        placeholder="Select a service"
        error={errors.serviceId}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          id="preferredDate"
          name="preferredDate"
          type="date"
          label="Preferred Date"
          required
          min={new Date().toISOString().split("T")[0]}
          error={errors.preferredDate}
        />
        <Select
          id="preferredTime"
          name="preferredTime"
          label="Preferred Time"
          required
          options={[
            { value: "08:00", label: "8:00 AM" },
            { value: "09:00", label: "9:00 AM" },
            { value: "10:00", label: "10:00 AM" },
            { value: "11:00", label: "11:00 AM" },
            { value: "13:00", label: "1:00 PM" },
            { value: "14:00", label: "2:00 PM" },
            { value: "15:00", label: "3:00 PM" },
            { value: "16:00", label: "4:00 PM" },
          ]}
          placeholder="Select time"
          error={errors.preferredTime}
        />
      </div>
      <Textarea
        id="notes"
        name="notes"
        label="Additional Notes"
        rows={3}
        placeholder="Any special requests or concerns..."
      />
      <Button type="submit" loading={loading} className="w-full sm:w-auto">
        Book Service
      </Button>
    </form>
  );
}
