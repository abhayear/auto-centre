"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

const sessionKey = (path: string) => `ag-analytics-${path}`;

export function SiteAnalyticsRecorder() {
  const pathname = usePathname();
  const lastPath = useRef<string | null>(null);

  useEffect(() => {
    if (!pathname || pathname === lastPath.current) return;
    lastPath.current = pathname;

    if (pathname.startsWith("/admin")) return;
    if (pathname === "/") return;

    if (sessionStorage.getItem(sessionKey(pathname)) === "1") return;

    fetch("/api/site-analytics/record", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: pathname }),
    })
      .then((res) => {
        if (res.ok) sessionStorage.setItem(sessionKey(pathname), "1");
      })
      .catch(() => {
        // ignore analytics failures
      });
  }, [pathname]);

  return null;
}
