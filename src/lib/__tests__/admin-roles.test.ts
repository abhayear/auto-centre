import { describe, expect, it } from "vitest";
import {
  canAssignWork,
  canEditCashBox,
  canEditTraining,
  canMergeReleases,
  canReadTraining,
  canUseOpsPortal,
  canViewReleases,
  trainingAudienceForRole,
} from "@/lib/admin-roles";

describe("canEditCashBox", () => {
  it("allows admin and restricts manager", () => {
    expect(canEditCashBox("admin")).toBe(true);
    expect(canEditCashBox("manager")).toBe(false);
  });
});

describe("portal permissions", () => {
  it("limits training edits to admin", () => {
    expect(canEditTraining("admin")).toBe(true);
    expect(canEditTraining("manager")).toBe(false);
    expect(canEditTraining("sales")).toBe(false);
  });

  it("lets each audience read only its training", () => {
    expect(canReadTraining("sales", "sales")).toBe(true);
    expect(canReadTraining("sales", "mechanic")).toBe(false);
    expect(canReadTraining("manager", "manager")).toBe(true);
    expect(canReadTraining("admin", "sales")).toBe(true);
  });

  it("gates ops, work, releases, and merge", () => {
    expect(canUseOpsPortal("manager")).toBe(true);
    expect(canUseOpsPortal("sales")).toBe(false);
    expect(canUseOpsPortal("junior_developer")).toBe(false);
    expect(canAssignWork("senior_developer")).toBe(true);
    expect(canAssignWork("junior_developer")).toBe(false);
    expect(canViewReleases("junior_developer")).toBe(true);
    expect(canViewReleases("manager")).toBe(false);
    expect(canMergeReleases("senior_developer")).toBe(true);
    expect(canMergeReleases("admin")).toBe(true);
    expect(canMergeReleases("junior_developer")).toBe(false);
  });

  it("maps roles to training audiences", () => {
    expect(trainingAudienceForRole("sales")).toBe("sales");
    expect(trainingAudienceForRole("mechanic")).toBe("mechanic");
    expect(trainingAudienceForRole("manager")).toBe("manager");
    expect(trainingAudienceForRole("admin")).toBeNull();
  });
});
