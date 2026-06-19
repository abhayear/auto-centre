import { Award, Users, Car } from "lucide-react";
import { SITE_NAME } from "@/lib/constants";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About",
  description: `Learn about ${SITE_NAME} — our story, team, and commitment to excellence.`,
};

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-12 max-w-3xl">
        <h1 className="text-3xl font-bold text-white">About {SITE_NAME}</h1>
        <p className="mt-4 text-lg text-slate-300 leading-relaxed">
          For over two decades, {SITE_NAME} has been the trusted destination for
          automotive sales and service in our community. We combine a curated selection
          of quality vehicles with expert maintenance to deliver a complete automotive
          experience.
        </p>
      </div>

      <div className="mb-16 grid gap-8 md:grid-cols-3">
        <div className="rounded-xl border border-slate-700/50 bg-slate-800/30 p-6 text-center">
          <Car className="mx-auto mb-4 h-10 w-10 text-red-500" />
          <h2 className="text-xl font-bold text-white">500+</h2>
          <p className="mt-1 text-slate-400">Vehicles Sold</p>
        </div>
        <div className="rounded-xl border border-slate-700/50 bg-slate-800/30 p-6 text-center">
          <Users className="mx-auto mb-4 h-10 w-10 text-red-500" />
          <h2 className="text-xl font-bold text-white">20+</h2>
          <p className="mt-1 text-slate-400">Years in Business</p>
        </div>
        <div className="rounded-xl border border-slate-700/50 bg-slate-800/30 p-6 text-center">
          <Award className="mx-auto mb-4 h-10 w-10 text-red-500" />
          <h2 className="text-xl font-bold text-white">Certified</h2>
          <p className="mt-1 text-slate-400">Factory-Trained Technicians</p>
        </div>
      </div>

      <div className="grid gap-10 lg:grid-cols-2">
        <div>
          <h2 className="mb-4 text-2xl font-bold text-white">Our Story</h2>
          <div className="space-y-4 text-slate-300 leading-relaxed">
            <p>
              Founded with a passion for automobiles and customer service, {SITE_NAME}{" "}
              started as a small family-owned dealership. Today, we&apos;ve grown into a
              full-service automotive centre while maintaining the personal touch that
              sets us apart.
            </p>
            <p>
              Every vehicle in our inventory is thoroughly inspected, and every service
              is performed by certified technicians using quality parts and equipment.
            </p>
          </div>
        </div>

        <div>
          <h2 className="mb-4 text-2xl font-bold text-white">Our Team</h2>
          <div className="space-y-4">
            {[
              { name: "James Mitchell", role: "General Manager" },
              { name: "Sarah Chen", role: "Sales Director" },
              { name: "Mike Rodriguez", role: "Service Manager" },
            ].map((member) => (
              <div
                key={member.name}
                className="flex items-center gap-4 rounded-lg border border-slate-700/50 bg-slate-800/30 p-4"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-600/20 text-lg font-bold text-red-400">
                  {member.name.charAt(0)}
                </div>
                <div>
                  <p className="font-medium text-white">{member.name}</p>
                  <p className="text-sm text-slate-400">{member.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-16 rounded-xl border border-slate-700/50 bg-slate-800/30 p-8">
        <h2 className="mb-4 text-2xl font-bold text-white">Certifications</h2>
        <ul className="grid gap-3 sm:grid-cols-2 text-slate-300">
          <li className="flex items-center gap-2">
            <Award className="h-4 w-4 text-red-500" />
            ASE Certified Technicians
          </li>
          <li className="flex items-center gap-2">
            <Award className="h-4 w-4 text-red-500" />
            Manufacturer Authorized Service
          </li>
          <li className="flex items-center gap-2">
            <Award className="h-4 w-4 text-red-500" />
            BBB Accredited Business
          </li>
          <li className="flex items-center gap-2">
            <Award className="h-4 w-4 text-red-500" />
            Quality Pre-Owned Certification
          </li>
        </ul>
      </div>
    </div>
  );
}
