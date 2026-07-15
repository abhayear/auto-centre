import { describe, expect, it } from "vitest";
import { DEFAULT_SERVICE_SCHEDULE_CONTENT } from "@/lib/service-schedule-default";
import { splitServiceScheduleContent } from "@/lib/service-schedule-content";

describe("splitServiceScheduleContent", () => {
  it("removes the Book at Auto Galaxy section from printable content", () => {
    const { main, bookSection } = splitServiceScheduleContent(DEFAULT_SERVICE_SCHEDULE_CONTENT);

    expect(main).not.toContain("Book at Auto Galaxy");
    expect(main).not.toContain("Book service online");
    expect(main).toContain("Important notes");
    expect(bookSection).toContain("Book at Auto Galaxy");
    expect(bookSection).toContain("We perform electric scooter");
  });
});
