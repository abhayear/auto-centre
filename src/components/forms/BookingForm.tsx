"use client";

import { useCallback, useState } from "react";
import toast from "react-hot-toast";
import { CheckCircle2, MapPin, XCircle } from "lucide-react";
import { LocationPicker, type ParsedLocation } from "@/components/maps/LocationPicker";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";

interface Service {
  id: string;
  name: string;
}

type AreaCheckState =
  | { status: "idle" }
  | { status: "checking" }
  | { status: "serviceable"; matchedArea: string; message: string }
  | { status: "not_serviceable"; message: string };

export function BookingForm({ services }: { services: Service[] }) {
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [customerArea, setCustomerArea] = useState("");
  const [parsedLocation, setParsedLocation] = useState<ParsedLocation | null>(null);
  const [areaCheck, setAreaCheck] = useState<AreaCheckState>({ status: "idle" });

  const canBook = areaCheck.status === "serviceable";

  const runAreaCheck = useCallback(
    async (location: ParsedLocation | null, manualArea?: string) => {
      const areaText = manualArea?.trim() || location?.displayLabel?.trim() || "";
      if (areaText.length < 2) {
        setErrors({ customerArea: "Enter your area or pick a location on the map" });
        return;
      }

      setErrors({});
      setAreaCheck({ status: "checking" });

      try {
        const payload = location
          ? {
              area: location.displayLabel,
              locality: location.locality,
              sublocality: location.sublocality,
              postalCode: location.postalCode,
              formattedAddress: location.formattedAddress,
              adminArea: location.adminArea,
              lat: location.lat,
              lng: location.lng,
            }
          : { area: areaText };

        const res = await fetch("/api/service-areas/check", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const result = await res.json();

        if (!res.ok) {
          setAreaCheck({ status: "idle" });
          toast.error(result.error ?? "Could not verify area");
          return;
        }

        if (result.serviceable) {
          setAreaCheck({
            status: "serviceable",
            matchedArea: result.matchedArea,
            message: result.message,
          });
        } else {
          setAreaCheck({
            status: "not_serviceable",
            message: result.message,
          });
        }
      } catch {
        setAreaCheck({ status: "idle" });
        toast.error("Could not verify area. Please try again.");
      }
    },
    []
  );

  function handleLocationSelect(location: ParsedLocation | null) {
    setParsedLocation(location);
    if (areaCheck.status !== "idle") {
      setAreaCheck({ status: "idle" });
    }
    if (location) {
      void runAreaCheck(location);
    }
  }

  function handleAreaChange(value: string) {
    setCustomerArea(value);
    setParsedLocation(null);
    if (areaCheck.status !== "idle") {
      setAreaCheck({ status: "idle" });
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!canBook) {
      toast.error("Please verify that your area is serviceable first.");
      return;
    }

    setLoading(true);
    setErrors({});

    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());

    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          customerArea: areaCheck.matchedArea,
          customerAddress: parsedLocation?.formattedAddress,
          locality: parsedLocation?.locality,
          sublocality: parsedLocation?.sublocality,
          postalCode: parsedLocation?.postalCode,
          latitude: parsedLocation?.lat,
          longitude: parsedLocation?.lng,
        }),
      });

      const result = await res.json();

      if (!res.ok) {
        if (result.details?.issues) {
          const fieldErrors: Record<string, string> = {};
          for (const issue of result.details.issues) {
            const path = issue.path?.[0] ?? issue.field;
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
      setCustomerArea("");
      setParsedLocation(null);
      setAreaCheck({ status: "idle" });
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="rounded-lg border border-slate-700/50 bg-slate-900/40 p-4">
        <div className="mb-3 flex items-center gap-2">
          <MapPin className="h-5 w-5 text-red-500" />
          <h2 className="font-semibold text-white">Step 1 — Your current location</h2>
        </div>
        <p className="mb-4 text-sm text-slate-400">
          We detect your current location to check service availability. Allow location access when
          prompted, or search for a different address.
        </p>

        <LocationPicker
          value={customerArea}
          onChange={handleAreaChange}
          onLocationSelect={handleLocationSelect}
          error={errors.customerArea}
          disabled={areaCheck.status === "checking"}
        />

        <div className="mt-4">
          <Button
            type="button"
            variant="secondary"
            loading={areaCheck.status === "checking"}
            onClick={() => runAreaCheck(parsedLocation, customerArea)}
          >
            Check service availability
          </Button>
        </div>

        {areaCheck.status === "serviceable" && (
          <div className="mt-4 flex items-start gap-2 rounded-lg border border-green-600/30 bg-green-950/30 p-3 text-sm text-green-300">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{areaCheck.message}</span>
          </div>
        )}

        {areaCheck.status === "not_serviceable" && (
          <div className="mt-4 flex items-start gap-2 rounded-lg border border-red-600/30 bg-red-950/30 p-3 text-sm text-red-300">
            <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{areaCheck.message}</span>
          </div>
        )}
      </div>

      {canBook && (
        <div className="space-y-4 border-t border-slate-700/50 pt-6">
          <h2 className="font-semibold text-white">Step 2 — Booking details</h2>

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
              label="E-Scooter (Make/Model/Year)"
              placeholder="e.g. Ola S1 Pro 2024"
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
        </div>
      )}
    </form>
  );
}
