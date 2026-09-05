import Link from "next/link";
import { PolicyLayout } from "@/components/legal/PolicyLayout";
import { LEGAL_PAGE_LINKS } from "@/lib/legal-pages";
import { SITE_NAME } from "@/lib/constants";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Policies",
  description: `Terms, privacy, refund, shipping, and contact pages for ${SITE_NAME}.`,
};

export default function PoliciesPage() {
  return (
    <PolicyLayout title="Policies" lastUpdated="5 September 2026">
      <p className="text-slate-300">
        These pages explain how {SITE_NAME} handles website use, data, payments, delivery, and
        support.
      </p>
      <ul className="space-y-3">
        {LEGAL_PAGE_LINKS.map((page) => (
          <li key={page.href}>
            <Link
              href={page.href}
              className="text-lg font-medium text-red-400 hover:text-red-300"
            >
              {page.label}
            </Link>
          </li>
        ))}
      </ul>
    </PolicyLayout>
  );
}
