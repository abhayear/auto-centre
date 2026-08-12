import Link from "next/link";
import type { ReactNode } from "react";
import { SITE_EMAIL, SITE_NAME, SITE_PHONE } from "@/lib/constants";

type PolicyLayoutProps = {
  title: string;
  lastUpdated: string;
  children: ReactNode;
};

export function PolicyLayout({ title, lastUpdated, children }: PolicyLayoutProps) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">{title}</h1>
        <p className="mt-2 text-sm text-slate-500">Last updated: {lastUpdated}</p>
        <p className="mt-4 text-slate-400">
          {SITE_NAME} ·{" "}
          <Link href="/contact" className="text-red-400 hover:text-red-300">
            Contact us
          </Link>
        </p>
      </div>

      <article className="prose-policy space-y-6 text-slate-300 leading-relaxed">{children}</article>

      <div className="mt-10 rounded-lg border border-slate-700/50 bg-slate-800/30 p-4 text-sm text-slate-400">
        <p className="font-medium text-slate-300">Questions about this policy?</p>
        <p className="mt-2">
          Email{" "}
          <a href={`mailto:${SITE_EMAIL}`} className="text-red-400 hover:text-red-300">
            {SITE_EMAIL}
          </a>{" "}
          or call {SITE_PHONE}.
        </p>
      </div>
    </div>
  );
}

export function PolicySection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="mb-3 text-xl font-semibold text-white">{title}</h2>
      <div className="space-y-3">{children}</div>
    </section>
  );
}
