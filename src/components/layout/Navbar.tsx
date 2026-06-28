"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Zap, Menu, X } from "lucide-react";
import { ONLINE_STORE_URL, SITE_NAME } from "@/lib/constants";
import { cn } from "@/lib/utils";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/vehicles", label: "E-Scooters" },
  { href: ONLINE_STORE_URL, label: "Online Store", external: true },
  { href: "/services", label: "Services" },
  { href: "/careers", label: "Careers" },
  { href: "/book-service", label: "Book Service" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

export function Navbar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-slate-800 bg-slate-900/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2 text-white">
          <Zap className="h-7 w-7 text-red-500" />
          <span className="text-lg font-bold tracking-tight">{SITE_NAME}</span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {navLinks.map((link) => {
            const className = cn(
              "rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              !link.external && pathname === link.href
                ? "bg-red-600/20 text-red-400"
                : "text-slate-300 hover:bg-slate-800 hover:text-white"
            );

            if (link.external) {
              return (
                <a
                  key={link.href}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={className}
                >
                  {link.label}
                </a>
              );
            }

            return (
              <Link key={link.href} href={link.href} className={className}>
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="hidden md:block">
          <Link
            href="/test-drive"
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700"
          >
            Test Ride
          </Link>
        </div>

        <button
          className="rounded-lg p-2 text-slate-300 hover:bg-slate-800 md:hidden"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {mobileOpen && (
        <nav className="border-t border-slate-800 px-4 py-4 md:hidden">
          <div className="flex flex-col gap-1">
            {navLinks.map((link) => {
              const className = cn(
                "rounded-lg px-3 py-2 text-sm font-medium",
                !link.external && pathname === link.href
                  ? "bg-red-600/20 text-red-400"
                  : "text-slate-300 hover:bg-slate-800"
              );

              if (link.external) {
                return (
                  <a
                    key={link.href}
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setMobileOpen(false)}
                    className={className}
                  >
                    {link.label}
                  </a>
                );
              }

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className={className}
                >
                  {link.label}
                </Link>
              );
            })}
            <Link
              href="/test-drive"
              onClick={() => setMobileOpen(false)}
              className="mt-2 rounded-lg bg-red-600 px-3 py-2 text-center text-sm font-medium text-white"
            >
              Test Ride
            </Link>
          </div>
        </nav>
      )}
    </header>
  );
}
