import { describe, expect, it } from "vitest";
import { formatVisitorCount } from "@/lib/visitor-count-format";

describe("formatVisitorCount", () => {
  it("formats numbers using en-IN locale", () => {
    expect(formatVisitorCount(0)).toBe("0");
    expect(formatVisitorCount(999)).toBe("999");
    expect(formatVisitorCount(1000)).toBe("1,000");
    expect(formatVisitorCount(1234567)).toBe("12,34,567");
  });
});
