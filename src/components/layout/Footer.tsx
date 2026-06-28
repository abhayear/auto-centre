import Link from "next/link";
import { Zap, Mail, MapPin, Phone } from "lucide-react";
import {
  ONLINE_STORE_URL,
  SITE_ADDRESS,
  SITE_EMAIL,
  SITE_NAME,
  SITE_PHONES,
  SITE_TAGLINE,
} from "@/lib/constants";

export function Footer() {
  return (
    <footer className="mt-auto border-t border-slate-800 bg-slate-950">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-8 md:grid-cols-3">
          <div>
            <div className="mb-4 flex items-center gap-2">
              <Zap className="h-6 w-6 text-red-500" />
              <span className="text-lg font-bold text-white">{SITE_NAME}</span>
            </div>
            <p className="text-sm text-slate-400">{SITE_TAGLINE}. {SITE_ADDRESS}.</p>
          </div>

          <div>
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-300">
              Quick Links
            </h3>
            <ul className="space-y-2 text-sm text-slate-400">
              <li>
                <Link href="/vehicles" className="hover:text-red-400">
                  Browse E-Scooters
                </Link>
              </li>
              <li>
                <a
                  href={ONLINE_STORE_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-red-400"
                >
                  Online Store
                </a>
              </li>
              <li>
                <Link href="/services" className="hover:text-red-400">
                  Our Services
                </Link>
              </li>
              <li>
                <Link href="/service-schedule" className="hover:text-red-400">
                  Service Schedule
                </Link>
              </li>
              <li>
                <Link href="/book-service" className="hover:text-red-400">
                  Book Service
                </Link>
              </li>
              <li>
                <Link href="/careers" className="hover:text-red-400">
                  Careers
                </Link>
              </li>
              <li>
                <Link href="/test-drive" className="hover:text-red-400">
                  Request Test Ride
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-300">
              Contact
            </h3>
            <ul className="space-y-3 text-sm text-slate-400">
              <li className="flex items-start gap-2">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
                {SITE_ADDRESS}
              </li>
              <li className="flex items-start gap-2">
                <Phone className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
                <span className="flex flex-col gap-1">
                  {SITE_PHONES.map((phone) => (
                    <a key={phone} href={`tel:${phone}`} className="hover:text-red-400">
                      {phone}
                    </a>
                  ))}
                </span>
              </li>
              <li className="flex items-center gap-2">
                <Mail className="h-4 w-4 shrink-0 text-red-500" />
                {SITE_EMAIL}
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 border-t border-slate-800 pt-8 text-center text-sm text-slate-500">
          &copy; {new Date().getFullYear()} {SITE_NAME}. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
