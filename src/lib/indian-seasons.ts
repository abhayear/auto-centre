export const SEASON_KINDS = [
  "republic_day",
  "holi",
  "akshaya_tritiya",
  "independence",
  "ganesh",
  "navratri",
  "diwali",
  "new_year",
  "monsoon",
  "none",
] as const;

export type SeasonKind = (typeof SEASON_KINDS)[number];

export type IndianSeason = {
  kind: SeasonKind;
  label: string;
  /** Multiplier vs sold-average / current list. Negative moves stock; positive captures demand. */
  priceDelta: number;
  reason: string;
  campaignKind: "festival" | "monsoon" | "custom";
};

type SeasonWindow = {
  kind: Exclude<SeasonKind, "none">;
  label: string;
  priceDelta: number;
  reason: string;
  campaignKind: "festival" | "monsoon";
  startMonth: number;
  startDay: number;
  endMonth: number;
  endDay: number;
};

const WINDOWS: SeasonWindow[] = [
  {
    kind: "republic_day",
    label: "Republic Day",
    priceDelta: 0.02,
    reason: "Republic Day demand — hold a modest premium vs recent sold prices.",
    campaignKind: "festival",
    startMonth: 1,
    startDay: 24,
    endMonth: 1,
    endDay: 28,
  },
  {
    kind: "holi",
    label: "Holi",
    priceDelta: 0.02,
    reason: "Holi week demand — a small lift vs sold prices captures festival buyers.",
    campaignKind: "festival",
    startMonth: 3,
    startDay: 1,
    endMonth: 3,
    endDay: 8,
  },
  {
    kind: "akshaya_tritiya",
    label: "Akshaya Tritiya",
    priceDelta: 0.03,
    reason: "Auspicious purchase window — buyers expect to close; a slight premium protects margin.",
    campaignKind: "festival",
    startMonth: 4,
    startDay: 28,
    endMonth: 5,
    endDay: 5,
  },
  {
    kind: "independence",
    label: "Independence Day",
    priceDelta: 0.02,
    reason: "Independence Day traffic — keep prices firm vs recent sold deals.",
    campaignKind: "festival",
    startMonth: 8,
    startDay: 13,
    endMonth: 8,
    endDay: 17,
  },
  {
    kind: "ganesh",
    label: "Ganesh Chaturthi",
    priceDelta: 0.02,
    reason: "Ganesh festival demand — prefer conversion at sold-average plus a small lift.",
    campaignKind: "festival",
    startMonth: 8,
    startDay: 25,
    endMonth: 9,
    endDay: 10,
  },
  {
    kind: "navratri",
    label: "Navratri / Dussehra",
    priceDelta: 0.02,
    reason: "Navratri and Dussehra buying — firm pricing vs sold history.",
    campaignKind: "festival",
    startMonth: 9,
    startDay: 20,
    endMonth: 10,
    endDay: 22,
  },
  {
    kind: "diwali",
    label: "Diwali",
    priceDelta: 0.03,
    reason: "Diwali is peak scooter demand — suggest a profit lift vs sold-average.",
    campaignKind: "festival",
    startMonth: 10,
    startDay: 20,
    endMonth: 11,
    endDay: 15,
  },
  {
    kind: "new_year",
    label: "New Year",
    priceDelta: 0.01,
    reason: "Year-end and New Year traffic — keep list close to sold-average.",
    campaignKind: "festival",
    startMonth: 12,
    startDay: 20,
    endMonth: 1,
    endDay: 5,
  },
  {
    kind: "monsoon",
    label: "Monsoon",
    priceDelta: -0.03,
    reason: "Monsoon typically slows walk-ins — a small cut vs sold-average helps move stock.",
    campaignKind: "monsoon",
    startMonth: 6,
    startDay: 1,
    endMonth: 9,
    endDay: 15,
  },
];

function isInWindow(now: Date, startMonth: number, startDay: number, endMonth: number, endDay: number): boolean {
  const year = now.getFullYear();
  const start = new Date(year, startMonth - 1, startDay, 0, 0, 0, 0);
  const end = new Date(year, endMonth - 1, endDay, 23, 59, 59, 999);

  if (end < start) {
    return now >= start || now <= new Date(year, endMonth - 1, endDay, 23, 59, 59, 999);
  }

  return now >= start && now <= end;
}

const NONE_SEASON: IndianSeason = {
  kind: "none",
  label: "Regular season",
  priceDelta: 0,
  reason: "No festival or monsoon window — suggest the sold-average, or keep the current list if none sold.",
  campaignKind: "custom",
};

export function getIndianSeason(now: Date = new Date()): IndianSeason {
  const match = WINDOWS.find((window) =>
    isInWindow(now, window.startMonth, window.startDay, window.endMonth, window.endDay),
  );

  if (!match) return NONE_SEASON;

  return {
    kind: match.kind,
    label: match.label,
    priceDelta: match.priceDelta,
    reason: match.reason,
    campaignKind: match.campaignKind,
  };
}

export function campaignDraftFromSeason(season: IndianSeason, now: Date = new Date()): {
  title: string;
  summary: string;
  kind: "festival" | "monsoon" | "custom";
  badgeLabel: string;
  startsAt: Date;
  endsAt: Date;
} {
  const startsAt = now;
  const endsAt = new Date(now);
  endsAt.setDate(endsAt.getDate() + 14);

  if (season.kind === "none") {
    return {
      title: "Showroom offer",
      summary: "Limited-period pricing on selected e-scooters. Visit the showroom or book online.",
      kind: "custom",
      badgeLabel: "Offer",
      startsAt,
      endsAt,
    };
  }

  return {
    title: `${season.label} offer`,
    summary: `${season.reason} Browse available e-scooters and lock a booking online.`,
    kind: season.campaignKind,
    badgeLabel: season.label,
    startsAt,
    endsAt,
  };
}
