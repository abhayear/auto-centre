"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import {
  buildOfferYearCalendar,
  type OfferCalendarBar,
  type OfferCalendarInput,
} from "@/lib/offer-calendar";
import { formatDate } from "@/lib/utils";

function barClasses(bar: OfferCalendarBar): string {
  if (!bar.published) {
    return "border border-dashed border-amber-500/70 bg-amber-950/70 text-amber-100 hover:bg-amber-900/80";
  }
  if (bar.status === "live") {
    return "bg-red-600/85 text-white hover:bg-red-600";
  }
  if (bar.status === "upcoming") {
    return "bg-sky-700/80 text-sky-50 hover:bg-sky-600";
  }
  return "bg-slate-600/80 text-slate-100 hover:bg-slate-500";
}

function OfferMonthCard({
  month,
  onSelectOffer,
}: {
  month: ReturnType<typeof buildOfferYearCalendar>["months"][number];
  onSelectOffer?: (id: string) => void;
}) {
  const laneCount = month.bars.reduce((max, bar) => Math.max(max, bar.lane + 1), 0);
  const ticks = [1, 10, 20, month.daysInMonth].filter(
    (day, index, all) => day <= month.daysInMonth && all.indexOf(day) === index,
  );

  return (
    <article
      className={`rounded-xl border p-4 ${
        month.isCurrent
          ? "border-red-500/40 bg-slate-800/50"
          : "border-slate-700/50 bg-slate-800/20"
      }`}
    >
      <div className="mb-3 flex items-baseline justify-between gap-2">
        <h3 className="text-sm font-semibold text-white">{month.label}</h3>
        <p className="text-xs text-slate-500">
          {month.bars.length === 0
            ? "No offers"
            : `${month.bars.length} offer${month.bars.length === 1 ? "" : "s"}`}
        </p>
      </div>

      <div className="relative mb-2 h-3">
        <svg viewBox={`0 0 ${month.daysInMonth} 8`} className="h-3 w-full text-slate-600" aria-hidden>
          {ticks.map((day) => (
            <g key={day}>
              <line
                x1={day - 0.5}
                y1="0"
                x2={day - 0.5}
                y2="8"
                stroke="currentColor"
                strokeWidth="0.35"
              />
            </g>
          ))}
        </svg>
        <div className="pointer-events-none absolute inset-x-0 top-3 flex justify-between text-[10px] text-slate-500">
          {ticks.map((day) => (
            <span key={day} style={{ position: "absolute", left: `${((day - 1) / month.daysInMonth) * 100}%` }}>
              {day}
            </span>
          ))}
        </div>
      </div>

      <div className="relative mt-5 min-h-10 space-y-1">
        {month.todayDay ? (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-y-0 z-10 w-px bg-red-400/80"
            style={{ left: `${((month.todayDay - 0.5) / month.daysInMonth) * 100}%` }}
          />
        ) : null}

        {laneCount === 0 ? (
          <p className="py-2 text-xs text-slate-500">Nothing scheduled this month.</p>
        ) : (
          Array.from({ length: laneCount }, (_, lane) => (
            <div key={lane} className="relative h-7">
              {month.bars
                .filter((bar) => bar.lane === lane)
                .map((bar) => {
                  const label = `${bar.title} · ${formatDate(bar.startsAt)} – ${formatDate(bar.endsAt)}`;
                  const className = `absolute top-0 flex h-7 items-center overflow-hidden rounded-md px-2 text-left text-[11px] font-medium leading-none ${barClasses(bar)}`;
                  const style = {
                    left: `${bar.leftPct}%`,
                    width: `${Math.max(bar.widthPct, 8)}%`,
                  };

                  if (onSelectOffer) {
                    return (
                      <button
                        key={bar.id}
                        type="button"
                        title={label}
                        aria-label={label}
                        className={className}
                        style={style}
                        onClick={() => onSelectOffer(bar.id)}
                      >
                        <span className="truncate">
                          {bar.clipsStart ? "← " : ""}
                          {bar.title}
                          {bar.clipsEnd ? " →" : ""}
                        </span>
                      </button>
                    );
                  }

                  return (
                    <div key={bar.id} title={label} className={className} style={style}>
                      <span className="truncate">
                        {bar.clipsStart ? "← " : ""}
                        {bar.title}
                        {bar.clipsEnd ? " →" : ""}
                      </span>
                    </div>
                  );
                })}
            </div>
          ))
        )}
      </div>
    </article>
  );
}

export function OfferYearCalendar({
  offers,
  onSelectOffer,
}: {
  offers: OfferCalendarInput[];
  onSelectOffer?: (id: string) => void;
}) {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const calendar = useMemo(
    () => buildOfferYearCalendar(year, offers, new Date()),
    [offers, year],
  );

  return (
    <section aria-labelledby="offer-year-calendar-heading">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id="offer-year-calendar-heading" className="text-lg font-semibold text-white">
            Offer calendar
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            Whole-year view of homepage offer windows. Click a bar to edit that offer.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => setYear((value) => value - 1)} aria-label="Previous year">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <p className="min-w-14 text-center text-sm font-semibold text-white">{calendar.year}</p>
          <Button variant="ghost" size="sm" onClick={() => setYear((value) => value + 1)} aria-label="Next year">
            <ChevronRight className="h-4 w-4" />
          </Button>
          {year !== currentYear ? (
            <Button variant="outline" size="sm" onClick={() => setYear(currentYear)}>
              This year
            </Button>
          ) : null}
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3 text-xs text-slate-400">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-5 rounded-sm bg-red-600/85" /> Live
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-5 rounded-sm bg-sky-700/80" /> Upcoming
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-5 rounded-sm bg-slate-600/80" /> Ended
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-5 rounded-sm border border-dashed border-amber-500/70 bg-amber-950/70" /> Draft
        </span>
        <Badge variant="default">{calendar.offerCount} in {calendar.year}</Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {calendar.months.map((month) => (
          <OfferMonthCard key={month.month} month={month} onSelectOffer={onSelectOffer} />
        ))}
      </div>
    </section>
  );
}
