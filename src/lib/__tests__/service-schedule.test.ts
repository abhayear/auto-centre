import { describe, expect, it } from "vitest";
import {
  DEFAULT_SERVICE_SCHEDULE_CONTENT,
  DEFAULT_SERVICE_SCHEDULE_TITLE,
} from "@/lib/service-schedule-default";
import { defaultSchedule } from "@/lib/service-schedule";
import { serviceScheduleSchema } from "@/lib/validators";

describe("serviceScheduleSchema", () => {
  it("accepts valid schedule content", () => {
    const result = serviceScheduleSchema.safeParse({
      title: DEFAULT_SERVICE_SCHEDULE_TITLE,
      summary: "Short intro",
      content: DEFAULT_SERVICE_SCHEDULE_CONTENT,
      published: true,
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty content", () => {
    const result = serviceScheduleSchema.safeParse({
      title: "Schedule",
      summary: null,
      content: "too short",
      published: true,
    });
    expect(result.success).toBe(false);
  });
});

describe("defaultSchedule", () => {
  it("includes the low-speed electric bike title", () => {
    expect(defaultSchedule.title).toContain("Low-Speed Electric Bike");
    expect(defaultSchedule.content).toContain("Why not rely on the meter?");
  });
});
