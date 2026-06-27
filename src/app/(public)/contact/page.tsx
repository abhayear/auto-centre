import { InquiryForm } from "@/components/forms/InquiryForm";
import { MapPin, Phone, Mail, Clock } from "lucide-react";
import {
  BUSINESS_HOURS,
  SITE_ADDRESS,
  SITE_EMAIL,
  SITE_NAME,
  SITE_PHONES,
} from "@/lib/constants";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact",
  description: `Get in touch with ${SITE_NAME}.`,
};

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-10">
        <h1 className="text-3xl font-bold text-white">Contact Us</h1>
        <p className="mt-2 text-slate-400">
          Have a question? We&apos;d love to hear from you.
        </p>
      </div>

      <div className="grid gap-10 lg:grid-cols-2">
        <div className="space-y-6">
          <div className="rounded-xl border border-slate-700/50 bg-slate-800/30 p-6">
            <h2 className="mb-4 text-lg font-semibold text-white">Get in Touch</h2>
            <ul className="space-y-4">
              <li className="flex items-start gap-3 text-slate-300">
                <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
                {SITE_ADDRESS}
              </li>
              <li className="flex items-start gap-3 text-slate-300">
                <Phone className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
                <span className="flex flex-col gap-1">
                  {SITE_PHONES.map((phone) => (
                    <a key={phone} href={`tel:${phone}`} className="hover:text-red-400">
                      {phone}
                    </a>
                  ))}
                </span>
              </li>
              <li className="flex items-center gap-3 text-slate-300">
                <Mail className="h-5 w-5 shrink-0 text-red-500" />
                {SITE_EMAIL}
              </li>
            </ul>
          </div>

          <div className="rounded-xl border border-slate-700/50 bg-slate-800/30 p-6">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-white">
              <Clock className="h-5 w-5 text-red-500" />
              Business Hours
            </h2>
            <ul className="space-y-2">
              {BUSINESS_HOURS.map((item) => (
                <li key={item.day} className="flex justify-between text-sm text-slate-300">
                  <span>{item.day}</span>
                  <span className="text-slate-400">{item.hours}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex aspect-[16/9] items-center justify-center rounded-xl border border-dashed border-slate-700 bg-slate-800/20">
            <div className="text-center text-slate-500">
              <MapPin className="mx-auto mb-2 h-8 w-8" />
              <p className="text-sm">Map placeholder</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-700/50 bg-slate-800/30 p-6">
          <h2 className="mb-4 text-lg font-semibold text-white">Send a Message</h2>
          <InquiryForm type="contact" />
        </div>
      </div>
    </div>
  );
}
