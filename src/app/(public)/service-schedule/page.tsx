import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarClock } from "lucide-react";
import { MarkdownContent } from "@/components/content/MarkdownContent";
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
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-10">
        <div className="mb-3 flex items-center gap-2 text-red-400">
          <CalendarClock className="h-6 w-6" />
          <span className="text-sm font-medium uppercase tracking-wider">Maintenance guide</span>
        </div>
        <h1 className="text-3xl font-bold text-white sm:text-4xl">{schedule.title}</h1>
        {schedule.summary && (
          <p className="mt-4 text-lg leading-relaxed text-slate-300">{schedule.summary}</p>
        )}
      </div>

      <div className="rounded-xl border border-slate-700/50 bg-slate-800/20 p-6 sm:p-8">
        <MarkdownContent content={schedule.content} />
      </div>

      <div className="mt-10 rounded-xl bg-gradient-to-r from-red-600/20 to-red-700/10 border border-red-600/30 p-8 text-center">
        <h2 className="text-xl font-bold text-white">Book your next service</h2>
        <p className="mt-2 text-slate-400">
          Doorstep service available in Lalitpur and nearby areas.
        </p>
        <Link
          href="/book-service"
          className="mt-4 inline-block rounded-lg bg-red-600 px-6 py-3 font-medium text-white hover:bg-red-700"
        >
          Book Service
        </Link>
      </div>
    </div>
  );
}
