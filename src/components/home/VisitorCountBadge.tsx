"use client";

import { useEffect, useRef, useState } from "react";
import { Eye } from "lucide-react";
import { formatVisitorCount } from "@/lib/visitor-count-format";

const SESSION_KEY = "ag-visit-recorded";
const ANIMATION_MS = 700;

type VisitorCountResponse = {
  visitorCount: number;
  showVisitorCount: boolean;
};

function animateCount(
  from: number,
  to: number,
  onUpdate: (value: number) => void,
  onComplete: () => void
) {
  const start = performance.now();

  function frame(now: number) {
    const progress = Math.min((now - start) / ANIMATION_MS, 1);
    const eased = 1 - (1 - progress) ** 3;
    const value = Math.round(from + (to - from) * eased);
    onUpdate(value);

    if (progress < 1) {
      requestAnimationFrame(frame);
    } else {
      onComplete();
    }
  }

  requestAnimationFrame(frame);
}

export function VisitorCountBadge({ className }: { className?: string }) {
  const [visible, setVisible] = useState(false);
  const [displayCount, setDisplayCount] = useState<number | null>(null);
  const mounted = useRef(false);

  useEffect(() => {
    if (mounted.current) return;
    mounted.current = true;

    let cancelled = false;

    async function load() {
      try {
        const alreadyRecorded = sessionStorage.getItem(SESSION_KEY) === "1";

        if (!alreadyRecorded) {
          const res = await fetch("/api/visitor-count", { method: "POST" });
          if (!res.ok || cancelled) return;

          const data = (await res.json()) as VisitorCountResponse;
          if (!data.showVisitorCount) return;

          sessionStorage.setItem(SESSION_KEY, "1");
          setVisible(true);

          const target = data.visitorCount;
          const start = Math.max(0, target - 1);
          setDisplayCount(start);

          animateCount(
            start,
            target,
            (value) => {
              if (!cancelled) setDisplayCount(value);
            },
            () => {
              if (!cancelled) setDisplayCount(target);
            }
          );
          return;
        }

        const res = await fetch("/api/visitor-count");
        if (!res.ok || cancelled) return;

        const data = (await res.json()) as VisitorCountResponse;
        if (!data.showVisitorCount) return;

        setVisible(true);
        setDisplayCount(data.visitorCount);
      } catch {
        // Hide badge if API unavailable
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  if (!visible || displayCount === null) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className={`inline-flex items-center gap-2 rounded-full border border-slate-600/60 bg-slate-900/60 px-4 py-2 text-sm text-slate-300 backdrop-blur-sm ${className ?? ""}`}
    >
      <Eye className="h-4 w-4 text-red-400" aria-hidden />
      <span>
        <span className="font-semibold text-white tabular-nums">
          {formatVisitorCount(displayCount)}
        </span>{" "}
        website visits
      </span>
    </div>
  );
}
