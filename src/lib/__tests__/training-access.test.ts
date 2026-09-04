import { describe, expect, it } from "vitest";
import { visibleTrainingRows } from "@/lib/training-access";

const sampleRows = [
  { audience: "sales", published: true },
  { audience: "sales", published: false },
  { audience: "mechanic", published: true },
  { audience: "manager", published: true },
  { audience: "manager", published: false },
];

describe("visibleTrainingRows", () => {
  it("returns all rows for admin", () => {
    expect(visibleTrainingRows("admin", sampleRows)).toEqual(sampleRows);
  });

  it("returns published sales rows for sales staff", () => {
    expect(visibleTrainingRows("sales", sampleRows)).toEqual([
      { audience: "sales", published: true },
    ]);
  });

  it("returns published mechanic rows for mechanics", () => {
    expect(visibleTrainingRows("mechanic", sampleRows)).toEqual([
      { audience: "mechanic", published: true },
    ]);
  });

  it("returns published manager rows for managers", () => {
    expect(visibleTrainingRows("manager", sampleRows)).toEqual([
      { audience: "manager", published: true },
    ]);
  });

  it("returns no rows for roles without a training audience", () => {
    expect(visibleTrainingRows("junior_developer", sampleRows)).toEqual([]);
    expect(visibleTrainingRows("senior_developer", sampleRows)).toEqual([]);
  });
});
