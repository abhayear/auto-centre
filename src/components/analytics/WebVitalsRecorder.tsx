"use client";

import { useEffect } from "react";

type VitalName = "LCP" | "INP" | "CLS" | "TTFB";

function rateMetric(name: VitalName, value: number): "good" | "needs-improvement" | "poor" {
  switch (name) {
    case "LCP":
      if (value <= 2500) return "good";
      if (value <= 4000) return "needs-improvement";
      return "poor";
    case "INP":
      if (value <= 200) return "good";
      if (value <= 500) return "needs-improvement";
      return "poor";
    case "CLS":
      if (value <= 0.1) return "good";
      if (value <= 0.25) return "needs-improvement";
      return "poor";
    case "TTFB":
      if (value <= 800) return "good";
      if (value <= 1800) return "needs-improvement";
      return "poor";
  }
}

function sessionKey(name: VitalName) {
  return `ag-web-vital-${name}-${window.location.pathname}`;
}

function sendVital(name: VitalName, value: number) {
  if (sessionStorage.getItem(sessionKey(name))) return;
  sessionStorage.setItem(sessionKey(name), "1");

  fetch("/api/web-vitals", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name,
      value,
      rating: rateMetric(name, value),
      path: window.location.pathname,
    }),
    keepalive: true,
  }).catch(() => undefined);
}

export function WebVitalsRecorder() {
  useEffect(() => {
    if (typeof window === "undefined" || !("PerformanceObserver" in window)) {
      return;
    }

    const observers: PerformanceObserver[] = [];

    try {
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const last = entries.at(-1);
        if (last) sendVital("LCP", last.startTime);
      });
      lcpObserver.observe({ type: "largest-contentful-paint", buffered: true });
      observers.push(lcpObserver);
    } catch {
      // unsupported in this browser
    }

    try {
      let clsValue = 0;
      const clsObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const layoutShift = entry as PerformanceEntry & {
            hadRecentInput?: boolean;
            value?: number;
          };
          if (!layoutShift.hadRecentInput && layoutShift.value) {
            clsValue += layoutShift.value;
          }
        }
      });
      clsObserver.observe({ type: "layout-shift", buffered: true });
      observers.push(clsObserver);

      const reportCls = () => sendVital("CLS", clsValue);
      window.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "hidden") reportCls();
      });
      window.addEventListener("pagehide", reportCls);
    } catch {
      // unsupported in this browser
    }

    try {
      const inpObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const eventEntry = entry as PerformanceEntry & { duration?: number };
          if (eventEntry.duration != null) {
            sendVital("INP", eventEntry.duration);
          }
        }
      });
      inpObserver.observe({
        type: "event",
        buffered: true,
      } as PerformanceObserverInit);
      observers.push(inpObserver);
    } catch {
      // unsupported in this browser
    }

    const nav = performance.getEntriesByType("navigation")[0] as
      | PerformanceNavigationTiming
      | undefined;
    if (nav) {
      sendVital("TTFB", nav.responseStart);
    }

    return () => {
      for (const observer of observers) {
        observer.disconnect();
      }
    };
  }, []);

  return null;
}
