import { describe, expect, it } from "vitest";
import {
  ELECTRIC_SCOOTER_MILESTONES,
  getAnnualServiceReminders,
  getMilestoneDueDates,
  getNextAnnualServiceReminder,
  getNextDueMilestone,
  getNextServiceDue,
  isOemScheduleComplete,
} from "@/lib/electric-scooter-service-schedule";

describe("electric scooter service schedule", () => {
  const delivery = new Date("2026-01-01T00:00:00.000Z");

  it("lists nine milestones from 60 to 1080 days", () => {
    expect(ELECTRIC_SCOOTER_MILESTONES).toHaveLength(9);
    expect(ELECTRIC_SCOOTER_MILESTONES[0]?.days).toBe(60);
    expect(ELECTRIC_SCOOTER_MILESTONES.at(-1)?.days).toBe(1080);
  });

  it("calculates due dates from delivery", () => {
    const due = getMilestoneDueDates(delivery, new Date("2026-04-15T00:00:00.000Z"));
    expect(due[0]?.status).toBe("overdue");
    expect(due[0]?.dueDate.toISOString().slice(0, 10)).toBe("2026-03-02");
    expect(due[2]?.id).toBe("3rd-ps");
  });

  it("returns next due milestone after last completed", () => {
    const next = getNextDueMilestone(
      delivery,
      new Date("2026-04-01T00:00:00.000Z"),
      "2nd-fs",
    );
    expect(next?.id).toBe("3rd-ps");
    expect(next?.days).toBe(300);
  });

  it("treats OEM schedule as complete after 9th PS is marked done", () => {
    expect(isOemScheduleComplete(delivery, new Date("2026-04-01T00:00:00.000Z"), "9th-ps")).toBe(
      true,
    );
    expect(
      getNextDueMilestone(delivery, new Date("2026-04-01T00:00:00.000Z"), "9th-ps"),
    ).toBeNull();
  });

  it("treats OEM schedule as complete after day 1080 even without selection", () => {
    const oldDelivery = new Date("2022-01-01T00:00:00.000Z");
    expect(isOemScheduleComplete(oldDelivery, new Date("2026-07-15T00:00:00.000Z"))).toBe(true);
    expect(getNextDueMilestone(oldDelivery, new Date("2026-07-15T00:00:00.000Z"))).toBeNull();
  });

  it("returns first annual reminder 365 days after 9th PS due date", () => {
    const annual = getNextAnnualServiceReminder(
      delivery,
      new Date("2029-01-01T00:00:00.000Z"),
      "9th-ps",
    );
    expect(annual?.type).toBe("annual");
    expect(annual?.yearNumber).toBe(1);
    expect(annual?.dueDate.toISOString().slice(0, 10)).toBe("2029-12-16");
  });

  it("advances to the next annual year once the prior year is fully past", () => {
    const annual = getNextAnnualServiceReminder(
      delivery,
      new Date("2031-01-01T00:00:00.000Z"),
      "9th-ps",
    );
    expect(annual?.yearNumber).toBe(2);
    expect(annual?.dueDate.toISOString().slice(0, 10)).toBe("2030-12-16");
  });

  it("prefers OEM milestones before annual reminders", () => {
    const next = getNextServiceDue(
      delivery,
      new Date("2026-04-01T00:00:00.000Z"),
      "2nd-fs",
    );
    expect(next?.id).toBe("3rd-ps");
  });

  it("falls back to annual reminder after OEM schedule ends", () => {
    const next = getNextServiceDue(
      delivery,
      new Date("2029-06-01T00:00:00.000Z"),
      "9th-ps",
    );
    expect(next?.type).toBe("annual");
    expect(next?.yearNumber).toBe(1);
  });

  it("lists three upcoming annual reminders", () => {
    const reminders = getAnnualServiceReminders(
      delivery,
      new Date("2029-01-01T00:00:00.000Z"),
      "9th-ps",
      3,
    );
    expect(reminders).toHaveLength(3);
    expect(reminders.map((r) => r.yearNumber)).toEqual([1, 2, 3]);
  });
});
