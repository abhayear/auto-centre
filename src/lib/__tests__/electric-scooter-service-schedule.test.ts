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

  it("lists ten milestones from 60 to 1080 days", () => {
    expect(ELECTRIC_SCOOTER_MILESTONES).toHaveLength(10);
    expect(ELECTRIC_SCOOTER_MILESTONES[0]?.days).toBe(60);
    expect(ELECTRIC_SCOOTER_MILESTONES.at(-1)?.days).toBe(1080);
  });

  it("spaces paid services 120 days apart after 4th free service", () => {
    expect(ELECTRIC_SCOOTER_MILESTONES[3]?.days).toBe(360);
    expect(ELECTRIC_SCOOTER_MILESTONES[4]?.days).toBe(480);
    expect(ELECTRIC_SCOOTER_MILESTONES[5]?.days).toBe(600);
    expect(ELECTRIC_SCOOTER_MILESTONES[6]?.days).toBe(720);
    expect(ELECTRIC_SCOOTER_MILESTONES[7]?.days).toBe(840);
    expect(ELECTRIC_SCOOTER_MILESTONES[8]?.days).toBe(960);
    expect(ELECTRIC_SCOOTER_MILESTONES[9]?.days).toBe(1080);
  });

  it("calculates due dates from delivery", () => {
    const due = getMilestoneDueDates(delivery, new Date("2026-04-15T00:00:00.000Z"));
    expect(due[0]?.status).toBe("overdue");
    expect(due[0]?.dueDate.toISOString().slice(0, 10)).toBe("2026-03-02");
    expect(due[2]?.id).toBe("3rd-fs");
  });

  it("returns next due milestone after last completed", () => {
    const next = getNextDueMilestone(
      delivery,
      new Date("2026-04-01T00:00:00.000Z"),
      "2nd-fs",
    );
    expect(next?.id).toBe("3rd-fs");
    expect(next?.days).toBe(270);
  });

  it("treats OEM schedule as complete after 10th PS is marked done", () => {
    expect(isOemScheduleComplete(delivery, new Date("2026-04-01T00:00:00.000Z"), "10th-ps")).toBe(
      true,
    );
    expect(
      getNextDueMilestone(delivery, new Date("2026-04-01T00:00:00.000Z"), "10th-ps"),
    ).toBeNull();
  });

  it("treats OEM schedule as complete after day 1080 even without selection", () => {
    const oldDelivery = new Date("2022-01-01T00:00:00.000Z");
    expect(isOemScheduleComplete(oldDelivery, new Date("2026-07-15T00:00:00.000Z"))).toBe(true);
    expect(getNextDueMilestone(oldDelivery, new Date("2026-07-15T00:00:00.000Z"))).toBeNull();
  });

  it("returns first annual reminder 365 days after 10th PS due date", () => {
    const annual = getNextAnnualServiceReminder(
      delivery,
      new Date("2029-01-01T00:00:00.000Z"),
      "10th-ps",
    );
    expect(annual?.type).toBe("annual");
    expect(annual?.yearNumber).toBe(1);
    expect(annual?.dueDate.toISOString().slice(0, 10)).toBe("2029-12-16");
  });

  it("advances to the next annual year once the prior year is fully past", () => {
    const annual = getNextAnnualServiceReminder(
      delivery,
      new Date("2031-01-01T00:00:00.000Z"),
      "10th-ps",
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
    expect(next?.id).toBe("3rd-fs");
  });

  it("falls back to annual reminder after OEM schedule ends", () => {
    const next = getNextServiceDue(
      delivery,
      new Date("2029-06-01T00:00:00.000Z"),
      "10th-ps",
    );
    expect(next?.type).toBe("annual");
    expect(next?.yearNumber).toBe(1);
  });

  it("lists three upcoming annual reminders", () => {
    const reminders = getAnnualServiceReminders(
      delivery,
      new Date("2029-01-01T00:00:00.000Z"),
      "10th-ps",
      3,
    );
    expect(reminders).toHaveLength(3);
    expect(reminders.map((r) => r.yearNumber)).toEqual([1, 2, 3]);
  });
});
