import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  Building2,
  Mail,
  MapPin,
  Phone,
  Target,
  TrendingUp,
  Zap,
} from "lucide-react";
import { PrintProposalButton } from "@/components/investment/PrintProposalButton";
import { INVESTMENT_PROPOSAL } from "@/lib/investment-proposal";
import { SITE_NAME } from "@/lib/constants";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Investment Proposal",
  description: `Investment opportunity at ${SITE_NAME} — electric 2-wheeler sales, service, and digital retail in Lalitpur.`,
};

const sections = [
  { id: "overview", label: "Overview" },
  { id: "market", label: "Market" },
  { id: "model", label: "Business Model" },
  { id: "traction", label: "Traction" },
  { id: "investment", label: "Investment Ask" },
  { id: "roadmap", label: "Roadmap" },
  { id: "contact", label: "Contact" },
];

export default function InvestmentPage() {
  const proposal = INVESTMENT_PROPOSAL;

  return (
    <div className="print:bg-white">
      <section className="border-b border-slate-800 bg-gradient-to-br from-slate-900 via-slate-900 to-red-950/40 print:border-none print:bg-white">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
          <p className="text-sm font-medium uppercase tracking-wider text-red-400 print:text-red-700">
            {proposal.confidentialNotice}
          </p>
          <h1 className="mt-3 text-3xl font-bold text-white sm:text-4xl print:text-slate-900">
            {proposal.title}
          </h1>
          <p className="mt-3 max-w-3xl text-lg text-slate-300 print:text-slate-700">
            {proposal.subtitle}
          </p>
          <p className="mt-2 text-sm text-slate-500 print:text-slate-600">
            Last updated: {proposal.lastUpdated}
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {proposal.highlights.map((item) => (
              <div
                key={item.label}
                className="rounded-xl border border-slate-700/50 bg-slate-800/40 p-4 print:border-slate-300 print:bg-slate-50"
              >
                <p className="text-2xl font-bold text-white print:text-slate-900">
                  {item.value}
                </p>
                <p className="mt-1 text-sm text-slate-400 print:text-slate-600">
                  {item.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <nav
          aria-label="Proposal sections"
          className="sticky top-[4.5rem] z-30 -mx-4 mb-10 overflow-x-auto border-b border-slate-800 bg-slate-900/95 px-4 py-3 backdrop-blur-md print:hidden"
        >
          <ul className="flex min-w-max gap-2">
            {sections.map((section) => (
              <li key={section.id}>
                <a
                  href={`#${section.id}`}
                  className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-300 transition-colors hover:bg-slate-800 hover:text-white"
                >
                  {section.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <section id="overview" className="scroll-mt-28 print:scroll-mt-0">
          <div className="rounded-xl border border-slate-700/50 bg-slate-800/30 p-8 print:border-slate-300 print:bg-white">
            <div className="mb-4 flex items-center gap-2">
              <Zap className="h-5 w-5 text-red-500" />
              <h2 className="text-2xl font-bold text-white print:text-slate-900">
                Executive Summary
              </h2>
            </div>
            <p className="leading-relaxed text-slate-300 print:text-slate-700">
              {proposal.executiveSummary}
            </p>

            <h3 className="mb-3 mt-8 text-xl font-bold text-white print:text-slate-900">
              {proposal.companyOverview.title}
            </h3>
            <div className="space-y-4 leading-relaxed text-slate-300 print:text-slate-700">
              {proposal.companyOverview.paragraphs.map((paragraph) => (
                <p key={paragraph.slice(0, 40)}>{paragraph}</p>
              ))}
            </div>
          </div>
        </section>

        <section id="market" className="mt-10 scroll-mt-28 print:scroll-mt-0">
          <div className="rounded-xl border border-slate-700/50 bg-slate-800/30 p-8 print:border-slate-300 print:bg-white">
            <div className="mb-4 flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-red-500" />
              <h2 className="text-2xl font-bold text-white print:text-slate-900">
                {proposal.marketOpportunity.title}
              </h2>
            </div>
            <ul className="space-y-3 text-slate-300 print:text-slate-700">
              {proposal.marketOpportunity.points.map((point) => (
                <li key={point.slice(0, 40)} className="flex gap-3">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-red-500" />
                  {point}
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section id="model" className="mt-10 scroll-mt-28 print:scroll-mt-0">
          <div className="rounded-xl border border-slate-700/50 bg-slate-800/30 p-8 print:border-slate-300 print:bg-white">
            <div className="mb-6 flex items-center gap-2">
              <Building2 className="h-5 w-5 text-red-500" />
              <h2 className="text-2xl font-bold text-white print:text-slate-900">
                {proposal.businessModel.title}
              </h2>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {proposal.businessModel.streams.map((stream) => (
                <div
                  key={stream.title}
                  className="rounded-lg border border-slate-700/50 bg-slate-900/40 p-4 print:border-slate-200 print:bg-slate-50"
                >
                  <p className="font-semibold text-white print:text-slate-900">
                    {stream.title}
                  </p>
                  <p className="mt-2 text-sm text-slate-400 print:text-slate-600">
                    {stream.detail}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="traction" className="mt-10 scroll-mt-28 print:scroll-mt-0">
          <div className="rounded-xl border border-slate-700/50 bg-slate-800/30 p-8 print:border-slate-300 print:bg-white">
            <div className="mb-4 flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-red-500" />
              <h2 className="text-2xl font-bold text-white print:text-slate-900">
                {proposal.traction.title}
              </h2>
            </div>
            <ul className="grid gap-3 sm:grid-cols-2">
              {proposal.traction.items.map((item) => (
                <li
                  key={item}
                  className="flex items-start gap-2 text-slate-300 print:text-slate-700"
                >
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-red-500" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section id="investment" className="mt-10 scroll-mt-28 print:scroll-mt-0">
          <div className="rounded-xl border border-red-900/40 bg-gradient-to-br from-slate-800/50 to-red-950/20 p-8 print:border-slate-300 print:bg-white">
            <div className="mb-4 flex items-center gap-2">
              <Target className="h-5 w-5 text-red-500" />
              <h2 className="text-2xl font-bold text-white print:text-slate-900">
                {proposal.investmentAsk.title}
              </h2>
            </div>
            <p className="leading-relaxed text-slate-300 print:text-slate-700">
              {proposal.investmentAsk.summary}
            </p>
            <ul className="mt-4 space-y-2 text-slate-300 print:text-slate-700">
              {proposal.investmentAsk.seeking.map((item) => (
                <li key={item} className="flex gap-3">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-red-500" />
                  {item}
                </li>
              ))}
            </ul>
            <p className="mt-6 text-sm italic text-slate-400 print:text-slate-600">
              {proposal.investmentAsk.note}
            </p>

            <h3 className="mb-4 mt-8 text-lg font-semibold text-white print:text-slate-900">
              {proposal.useOfFunds.title}
            </h3>
            <div className="grid gap-3 sm:grid-cols-2">
              {proposal.useOfFunds.items.map((item) => (
                <div
                  key={item.area}
                  className="flex items-center justify-between rounded-lg border border-slate-700/50 bg-slate-900/40 px-4 py-3 print:border-slate-200 print:bg-slate-50"
                >
                  <span className="text-slate-300 print:text-slate-700">{item.area}</span>
                  <span className="font-bold text-red-400 print:text-red-700">
                    {item.share}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="roadmap" className="mt-10 scroll-mt-28 print:scroll-mt-0">
          <div className="rounded-xl border border-slate-700/50 bg-slate-800/30 p-8 print:border-slate-300 print:bg-white">
            <h2 className="mb-6 text-2xl font-bold text-white print:text-slate-900">
              {proposal.roadmap.title}
            </h2>
            <div className="space-y-6">
              {proposal.roadmap.phases.map((phase) => (
                <div
                  key={phase.period}
                  className="rounded-lg border border-slate-700/50 bg-slate-900/40 p-5 print:border-slate-200 print:bg-slate-50"
                >
                  <p className="font-semibold text-red-400 print:text-red-700">
                    {phase.period}
                  </p>
                  <ul className="mt-3 space-y-2 text-slate-300 print:text-slate-700">
                    {phase.goals.map((goal) => (
                      <li key={goal} className="flex gap-3">
                        <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-red-500" />
                        {goal}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="contact" className="mt-10 scroll-mt-28 print:scroll-mt-0">
          <div className="rounded-xl border border-slate-700/50 bg-slate-800/30 p-8 print:border-slate-300 print:bg-white">
            <h2 className="text-2xl font-bold text-white print:text-slate-900">
              {proposal.contact.title}
            </h2>
            <p className="mt-2 text-slate-400 print:text-slate-600">
              {proposal.contact.cta}
            </p>

            <ul className="mt-6 space-y-4 text-slate-300 print:text-slate-700">
              <li className="flex items-center gap-3">
                <Mail className="h-5 w-5 shrink-0 text-red-500" />
                <a
                  href={`mailto:${proposal.contact.email}?subject=Investment%20inquiry%20-%20${encodeURIComponent(SITE_NAME)}`}
                  className="hover:text-red-400 print:text-slate-900"
                >
                  {proposal.contact.email}
                </a>
              </li>
              <li className="flex items-start gap-3">
                <Phone className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
                <span className="flex flex-col gap-1">
                  {proposal.contact.phones.map((phone) => (
                    <a
                      key={phone}
                      href={`tel:${phone}`}
                      className="hover:text-red-400 print:text-slate-900"
                    >
                      {phone}
                    </a>
                  ))}
                </span>
              </li>
              <li className="flex items-start gap-3">
                <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
                {proposal.contact.address}
              </li>
            </ul>

            <div className="mt-8 flex flex-wrap gap-4 print:hidden">
              <Link
                href="/contact"
                className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-red-700"
              >
                Contact Form
                <ArrowRight className="h-4 w-4" />
              </Link>
              <PrintProposalButton />
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
