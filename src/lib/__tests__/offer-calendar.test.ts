import { describe, expect, it } from "vitest";
import {
  buildOfferYearCalendar,
  clipOfferToMonth,
  offerOverlapsYear,
  offerWindowStatus,
} from "../offer-calendar";

function offer(
  overrides: Partial<{
    id: string;
    title: string;
    kind: string;
    published: boolean;
    sortOrder: number;
    startsAt: Date | string;
    endsAt: Date | string;
  }> = {},
) {
  return {
    id: "diwali",
    title: "Diwali offer",
    kind: "festival",
    published: true,
    sortOrder: 0,
    startsAt: new Date(2026, 9, 20, 9, 0, 0),
    endsAt: new Date(2026, 10, 15, 18, 0, 0),
    ...overrides,
  };
}

describe("offerOverlapsYear", () => {
  it("is true when the offer sits inside the year", () => {
    expect(offerOverlapsYear(offer(), 2026)).toBe(true);
  });

  it("is false when the offer is entirely in another year", () => {
    expect(offerOverlapsYear(offer(), 2025)).toBe(false);
    expect(offerOverlapsYear(offer(), 2027)).toBe(false);
  });

  it("is true when the offer starts in the previous year and ends in January", () => {
    const newYear = offer({
      startsAt: new Date(2025, 11, 20),
      endsAt: new Date(2026, 0, 5, 23, 59, 59),
    });
    expect(offerOverlapsYear(newYear, 2025)).toBe(true);
    expect(offerOverlapsYear(newYear, 2026)).toBe(true);
  });
});

describe("clipOfferToMonth", () => {
  it("clips a multi-month offer to the days it occupies in October", () => {
    const bar = clipOfferToMonth(offer(), 2026, 10);
    expect(bar).toMatchObject({
      startDay: 20,
      endDay: 31,
      clipsStart: false,
      clipsEnd: true,
    });
    expect(bar?.leftPct).toBeCloseTo(((20 - 1) / 31) * 100);
    expect(bar?.widthPct).toBeCloseTo((12 / 31) * 100);
  });

  it("clips the same offer to 1–15 November", () => {
    const bar = clipOfferToMonth(offer(), 2026, 11);
    expect(bar).toMatchObject({
      startDay: 1,
      endDay: 15,
      clipsStart: true,
      clipsEnd: false,
      leftPct: 0,
    });
    expect(bar?.widthPct).toBeCloseTo((15 / 30) * 100);
  });

  it("returns null when the offer does not touch the month", () => {
    expect(clipOfferToMonth(offer(), 2026, 6)).toBeNull();
  });

  it("uses a full February width in a leap year", () => {
    const bar = clipOfferToMonth(
      offer({
        startsAt: new Date(2024, 1, 1),
        endsAt: new Date(2024, 1, 29, 23, 59, 59),
      }),
      2024,
      2,
    );
    expect(bar).toMatchObject({ startDay: 1, endDay: 29, leftPct: 0, widthPct: 100 });
  });
});

describe("offerWindowStatus", () => {
  const window = offer();

  it("is live when now is inside the range", () => {
    expect(offerWindowStatus(window, new Date(2026, 10, 1))).toBe("live");
  });

  it("is upcoming before the start", () => {
    expect(offerWindowStatus(window, new Date(2026, 8, 1))).toBe("upcoming");
  });

  it("is ended after the end", () => {
    expect(offerWindowStatus(window, new Date(2026, 11, 1))).toBe("ended");
  });
});

describe("buildOfferYearCalendar", () => {
  it("plots each overlapping offer as a bar on every month it covers", () => {
    const calendar = buildOfferYearCalendar(2026, [offer()], new Date(2026, 8, 12));
    expect(calendar.year).toBe(2026);
    expect(calendar.offerCount).toBe(1);
    expect(calendar.months).toHaveLength(12);
    expect(calendar.months[8]?.label).toBe("September");
    expect(calendar.months[8]?.isCurrent).toBe(true);
    expect(calendar.months[8]?.todayDay).toBe(12);
    expect(calendar.months[8]?.bars).toHaveLength(0);
    expect(calendar.months[9]?.bars.map((bar) => bar.startDay)).toEqual([20]);
    expect(calendar.months[10]?.bars.map((bar) => bar.endDay)).toEqual([15]);
  });

  it("accepts ISO strings from the campaigns API", () => {
    const calendar = buildOfferYearCalendar(2026, [
      offer({
        startsAt: "2026-10-20T03:30:00.000Z",
        endsAt: "2026-11-15T12:30:00.000Z",
      }),
    ]);
    expect(calendar.offerCount).toBe(1);
    expect(calendar.months[9]?.bars).toHaveLength(1);
  });

  it("skips inverted ranges and offers outside the year", () => {
    const calendar = buildOfferYearCalendar(2026, [
      offer({ id: "inverted", startsAt: new Date(2026, 5, 10), endsAt: new Date(2026, 5, 1) }),
      offer({
        id: "other-year",
        startsAt: new Date(2025, 2, 1),
        endsAt: new Date(2025, 2, 10),
      }),
    ]);
    expect(calendar.offerCount).toBe(0);
    expect(calendar.months.every((month) => month.bars.length === 0)).toBe(true);
  });

  it("stacks overlapping offers on different lanes and reuses a lane when they do not overlap", () => {
    const calendar = buildOfferYearCalendar(2026, [
      offer({
        id: "a",
        title: "A",
        startsAt: new Date(2026, 9, 1),
        endsAt: new Date(2026, 9, 12),
      }),
      offer({
        id: "b",
        title: "B",
        startsAt: new Date(2026, 9, 8),
        endsAt: new Date(2026, 9, 20),
      }),
      offer({
        id: "c",
        title: "C",
        startsAt: new Date(2026, 9, 22),
        endsAt: new Date(2026, 9, 28),
      }),
    ]);
    const bars = calendar.months[9]?.bars ?? [];
    const byId = Object.fromEntries(bars.map((bar) => [bar.id, bar]));
    expect(byId.a?.lane).toBe(0);
    expect(byId.b?.lane).toBe(1);
    expect(byId.c?.lane).toBe(0);
  });

  it("sorts bars by start day, then sort order", () => {
    const calendar = buildOfferYearCalendar(2026, [
      offer({
        id: "late",
        sortOrder: 0,
        startsAt: new Date(2026, 9, 20),
        endsAt: new Date(2026, 9, 25),
      }),
      offer({
        id: "early-second",
        sortOrder: 2,
        startsAt: new Date(2026, 9, 5),
        endsAt: new Date(2026, 9, 8),
      }),
      offer({
        id: "early-first",
        sortOrder: 1,
        startsAt: new Date(2026, 9, 5),
        endsAt: new Date(2026, 9, 8),
      }),
    ]);
    expect(calendar.months[9]?.bars.map((bar) => bar.id)).toEqual([
      "early-first",
      "early-second",
      "late",
    ]);
  });
});
