import { notFound } from "next/navigation";
import { ServiceSchedulePageClient } from "@/components/service-schedule/ServiceSchedulePageClient";
import { SITE_NAME } from "@/lib/constants";
import { getPublishedServiceSchedule } from "@/lib/service-schedule";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const schedule = await getPublishedServiceSchedule();
  if (!schedule) {
    return { title: "Service Schedule" };
  }

  return {
    title: "Service Schedule",
    description: schedule.summary ?? `Electric bike service schedule at ${SITE_NAME}, Lalitpur.`,
  };
}

export default async function ServiceSchedulePage() {
  const schedule = await getPublishedServiceSchedule();
  if (!schedule) notFound();

  return (
    <ServiceSchedulePageClient
      title={schedule.title}
      summary={schedule.summary}
      content={schedule.content}
    />
  );
}
