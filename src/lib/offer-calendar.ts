export type OfferCalendarInput = {
  id: string;
  title: string;
  kind: string;
  published: boolean;
  sortOrder?: number;
  startsAt: Date | string;
  endsAt: Date | string;
};

export type OfferWindowStatus = "live" | "upcoming" | "ended";

export type OfferCalendarBar = {
  id: string;
  title: string;
  kind: string;
  published: boolean;
  status: OfferWindowStatus;
  startsAt: Date;
  endsAt: Date;
  startDay: number;
  endDay: number;
  leftPct: number;
  widthPct: number;
  clipsStart: boolean;
  clipsEnd: boolean;
  lane: number;
};

export type OfferCalendarMonth = {
  year: number;
  month: number;
  label: string;
  daysInMonth: number;
  isCurrent: boolean;
  todayDay: number | null;
  bars: OfferCalendarBar[];
};

export type OfferYearCalendar = {
  year: number;
  offerCount: number;
  months: OfferCalendarMonth[];
};

const MONTH_LABELS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

export function toOfferDate(value: Date | string): Date {
  return value instanceof Date ? value : new Date(value);
}

function startOfYear(year: number): Date {
  return new Date(year, 0, 1, 0, 0, 0, 0);
}

function endOfYear(year: number): Date {
  return new Date(year, 11, 31, 23, 59, 59, 999);
}

function startOfMonth(year: number, month: number): Date {
  return new Date(year, month - 1, 1, 0, 0, 0, 0);
}

function endOfMonth(year: number, month: number): Date {
  return new Date(year, month, 0, 23, 59, 59, 999);
}

function hasValidRange(offer: OfferCalendarInput): boolean {
  return toOfferDate(offer.endsAt) >= toOfferDate(offer.startsAt);
}

export function offerOverlapsYear(offer: OfferCalendarInput, year: number): boolean {
  if (!hasValidRange(offer)) return false;
  const start = toOfferDate(offer.startsAt);
  const end = toOfferDate(offer.endsAt);
  return start <= endOfYear(year) && end >= startOfYear(year);
}

export function offerWindowStatus(
  offer: OfferCalendarInput,
  now: Date = new Date(),
): OfferWindowStatus {
  const start = toOfferDate(offer.startsAt);
  const end = toOfferDate(offer.endsAt);
  if (now < start) return "upcoming";
  if (now > end) return "ended";
  return "live";
}

export function clipOfferToMonth(
  offer: OfferCalendarInput,
  year: number,
  month: number,
  now: Date = new Date(),
): Omit<OfferCalendarBar, "lane"> | null {
  if (!hasValidRange(offer)) return null;

  const start = toOfferDate(offer.startsAt);
  const end = toOfferDate(offer.endsAt);
  const monthStart = startOfMonth(year, month);
  const monthEnd = endOfMonth(year, month);
  if (start > monthEnd || end < monthStart) return null;

  const clippedStart = start < monthStart ? monthStart : start;
  const clippedEnd = end > monthEnd ? monthEnd : end;
  const daysInMonth = monthEnd.getDate();
  const startDay = clippedStart.getDate();
  const endDay = clippedEnd.getDate();

  return {
    id: offer.id,
    title: offer.title,
    kind: offer.kind,
    published: offer.published,
    status: offerWindowStatus(offer, now),
    startsAt: start,
    endsAt: end,
    startDay,
    endDay,
    leftPct: ((startDay - 1) / daysInMonth) * 100,
    widthPct: ((endDay - startDay + 1) / daysInMonth) * 100,
    clipsStart: start < monthStart,
    clipsEnd: end > monthEnd,
  };
}

function assignLanes(bars: Array<Omit<OfferCalendarBar, "lane">>): OfferCalendarBar[] {
  const laneEnds: number[] = [];

  return bars.map((bar) => {
    let lane = laneEnds.findIndex((endDay) => endDay < bar.startDay);
    if (lane === -1) {
      lane = laneEnds.length;
      laneEnds.push(bar.endDay);
    } else {
      laneEnds[lane] = bar.endDay;
    }
    return { ...bar, lane };
  });
}

function sortOffers(offers: OfferCalendarInput[]): OfferCalendarInput[] {
  return [...offers].sort((a, b) => {
    const startDiff = toOfferDate(a.startsAt).getTime() - toOfferDate(b.startsAt).getTime();
    if (startDiff !== 0) return startDiff;
    return (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
  });
}

export function buildOfferYearCalendar(
  year: number,
  offers: OfferCalendarInput[],
  now: Date = new Date(),
): OfferYearCalendar {
  const inYear = sortOffers(offers.filter((offer) => offerOverlapsYear(offer, year)));

  const months = MONTH_LABELS.map((label, index) => {
    const month = index + 1;
    const daysInMonth = endOfMonth(year, month).getDate();
    const isCurrent = now.getFullYear() === year && now.getMonth() + 1 === month;
    const bars = assignLanes(
      inYear
        .map((offer) => clipOfferToMonth(offer, year, month, now))
        .filter((bar): bar is Omit<OfferCalendarBar, "lane"> => bar !== null),
    );

    return {
      year,
      month,
      label,
      daysInMonth,
      isCurrent,
      todayDay: isCurrent ? now.getDate() : null,
      bars,
    };
  });

  return {
    year,
    offerCount: inYear.length,
    months,
  };
}

