"use client";

import { useEffect, useState } from "react";
import { Bell } from "lucide-react";

type SiteSettingsResponse = {
  noticeText: string | null;
  noticeActive: boolean;
};

async function fetchActiveNotice(): Promise<string | null> {
  const res = await fetch("/api/site-settings", { cache: "no-store" });
  if (!res.ok) return null;

  const data = (await res.json()) as SiteSettingsResponse;
  const text = data.noticeActive ? data.noticeText?.trim() : null;
  return text || null;
}

export function NoticeBanner() {
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    fetchActiveNotice()
      .then((text) => {
        if (active) setNotice(text);
      })
      .catch(() => {
        if (active) setNotice(null);
      });

    function handleSettingsUpdated() {
      fetchActiveNotice()
        .then((text) => {
          if (active) setNotice(text);
        })
        .catch(() => {
          if (active) setNotice(null);
        });
    }

    window.addEventListener("site-settings-updated", handleSettingsUpdated);
    return () => {
      active = false;
      window.removeEventListener("site-settings-updated", handleSettingsUpdated);
    };
  }, []);

  if (!notice) return null;

  const marqueeText = `${notice}   •   ${notice}   •   ${notice}   •   ${notice}`;

  return (
    <div
      role="status"
      aria-live="polite"
      className="border-b border-amber-600/30 bg-amber-950/90 py-2"
    >
      <div className="flex items-center gap-3 overflow-hidden px-4">
        <Bell className="h-4 w-4 shrink-0 text-amber-400" aria-hidden />
        <div className="relative min-w-0 flex-1 overflow-hidden">
          <div className="notice-marquee-track text-sm font-medium text-amber-100">
            <span className="notice-marquee-content">{marqueeText}</span>
            <span className="notice-marquee-content" aria-hidden>
              {marqueeText}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
