import Link from "next/link";
import { Suspense } from "react";
import { ClipboardList } from "lucide-react";
import { ApplicationTrackForm } from "@/components/forms/ApplicationTrackForm";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Track Application",
  description: "Check the status of your job application using your tracking code and email.",
};

type PageProps = {
  searchParams: Promise<{ code?: string; trackingCode?: string; email?: string }>;
};

export default async function TrackApplicationPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const initialCode = params.code ?? params.trackingCode ?? "";
  const initialEmail = params.email ?? "";

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6 lg:px-8">
      <Link href="/careers" className="mb-6 inline-block text-sm text-red-400 hover:text-red-300">
        ← Back to careers
      </Link>

      <div className="mb-8">
        <div className="mb-3 flex items-center gap-2">
          <ClipboardList className="h-6 w-6 text-red-500" />
          <h1 className="text-3xl font-bold text-white">Track Your Application</h1>
        </div>
        <p className="text-slate-400">
          Enter the tracking code from your confirmation email and the email address you used when
          applying.
        </p>
      </div>

      <div className="rounded-xl border border-slate-700/50 bg-slate-800/30 p-6">
        <Suspense
          fallback={
            <div className="flex justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-red-500 border-t-transparent" />
            </div>
          }
        >
          <ApplicationTrackForm initialCode={initialCode} initialEmail={initialEmail} />
        </Suspense>
      </div>
    </div>
  );
}
