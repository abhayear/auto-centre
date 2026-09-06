import { describe, expect, it } from "vitest";
import {
  isCompactServiceSchedulePaper,
  isServiceSchedulePaperSize,
  serviceSchedulePrintMaxHeightMm,
} from "@/lib/service-schedule-paper";

describe("service-schedule paper sizes", () => {
  it("accepts ISO A sizes used in the dropdown", () => {
    expect(isServiceSchedulePaperSize("A4")).toBe(true);
    expect(isServiceSchedulePaperSize("A3")).toBe(true);
    expect(isServiceSchedulePaperSize("Letter")).toBe(false);
  });

  it("sizes printable content to one page minus 8mm margins", () => {
    expect(serviceSchedulePrintMaxHeightMm("A4")).toBe(281);
    expect(serviceSchedulePrintMaxHeightMm("A5")).toBe(194);
    expect(serviceSchedulePrintMaxHeightMm("A3")).toBe(404);
  });

  it("treats A4 and A5 as compact one-page sheets", () => {
    expect(isCompactServiceSchedulePaper("A4")).toBe(true);
    expect(isCompactServiceSchedulePaper("A5")).toBe(true);
    expect(isCompactServiceSchedulePaper("A3")).toBe(false);
  });
});
