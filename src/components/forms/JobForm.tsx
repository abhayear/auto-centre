"use client";

import { JobPosting } from "@prisma/client";
import { useState } from "react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";

interface JobFormProps {
  job?: JobPosting;
  onSuccess: () => void;
  onCancel: () => void;
}

const employmentOptions = [
  { value: "full_time", label: "Full-time" },
  { value: "part_time", label: "Part-time" },
  { value: "contract", label: "Contract" },
];

const statusOptions = [
  { value: "open", label: "Open" },
  { value: "closed", label: "Closed" },
];

export function JobForm({ job, onSuccess, onCancel }: JobFormProps) {
  const [loading, setLoading] = useState(false);
  const isEdit = !!job;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const data = {
      title: formData.get("title"),
      department: formData.get("department"),
      location: formData.get("location"),
      employmentType: formData.get("employmentType"),
      description: formData.get("description"),
      requirements: formData.get("requirements"),
      salaryRange: formData.get("salaryRange") || undefined,
      status: formData.get("status"),
      active: formData.get("active") === "on",
    };

    try {
      const res = await fetch("/api/jobs", {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(isEdit ? { id: job.id, ...data } : data),
      });

      if (!res.ok) {
        const result = await res.json();
        const detailMessage = Array.isArray(result.details)
          ? result.details.map((d: { message: string }) => d.message).join(". ")
          : undefined;
        toast.error(detailMessage ?? result.error ?? "Failed to save job posting");
        return;
      }

      toast.success(isEdit ? "Job posting updated" : "Job posting created");
      onSuccess();
    } catch {
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal
      open
      onClose={onCancel}
      title={isEdit ? "Edit Job Posting" : "Add Job Posting"}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="max-h-[70vh] space-y-4 overflow-y-auto pr-2">
        <Input id="title" name="title" label="Job Title" defaultValue={job?.title} required />
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            id="department"
            name="department"
            label="Department"
            defaultValue={job?.department}
            placeholder="e.g. Sales, Service"
            required
          />
          <Input
            id="location"
            name="location"
            label="Location"
            defaultValue={job?.location}
            placeholder="e.g. Auto City, AC"
            required
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Select
            id="employmentType"
            name="employmentType"
            label="Employment Type"
            defaultValue={job?.employmentType ?? "full_time"}
            options={employmentOptions}
          />
          <Select
            id="status"
            name="status"
            label="Status"
            defaultValue={job?.status ?? "open"}
            options={statusOptions}
          />
        </div>
        <Input
          id="salaryRange"
          name="salaryRange"
          label="Salary Range (optional)"
          defaultValue={job?.salaryRange ?? ""}
          placeholder="e.g. $45,000 - $55,000"
        />
        <Textarea
          id="description"
          name="description"
          label="Job Description"
          rows={4}
          defaultValue={job?.description}
          required
        />
        <Textarea
          id="requirements"
          name="requirements"
          label="Requirements"
          rows={3}
          defaultValue={job?.requirements}
          placeholder="One requirement per line or paragraph..."
          required
        />
        <label className="flex items-center gap-2 text-sm text-slate-300">
          <input
            type="checkbox"
            name="active"
            defaultChecked={job?.active ?? true}
            className="rounded border-slate-600 bg-slate-800 text-red-600 focus:ring-red-500"
          />
          Visible on careers page
        </label>
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" loading={loading}>
            {isEdit ? "Update" : "Create"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
