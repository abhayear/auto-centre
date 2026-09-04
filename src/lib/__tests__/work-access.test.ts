import { describe, expect, it } from "vitest";
import { canPatchWorkItem, canViewWorkItem } from "@/lib/work-access";

describe("canViewWorkItem", () => {
  it("allows work assigners to view any item", () => {
    expect(
      canViewWorkItem("admin", "admin-id", {
        assigneeId: "junior-id",
        createdById: "creator-id",
      }),
    ).toBe(true);
    expect(
      canViewWorkItem("senior_developer", "senior-id", {
        assigneeId: null,
        createdById: "creator-id",
      }),
    ).toBe(true);
  });

  it("allows a junior developer to view assigned work", () => {
    expect(
      canViewWorkItem("junior_developer", "junior-id", {
        assigneeId: "junior-id",
        createdById: "admin-id",
      }),
    ).toBe(true);
  });

  it("denies non-assigners access to work assigned elsewhere or unassigned", () => {
    expect(
      canViewWorkItem("junior_developer", "junior-id", {
        assigneeId: "other-id",
        createdById: "admin-id",
      }),
    ).toBe(false);
    expect(
      canViewWorkItem("junior_developer", "junior-id", {
        assigneeId: null,
        createdById: "junior-id",
      }),
    ).toBe(false);
  });
});

describe("canPatchWorkItem", () => {
  it("allows work assigners to patch all supported fields", () => {
    expect(
      canPatchWorkItem(
        "admin",
        "admin-id",
        { assigneeId: "junior-id" },
        { title: "Updated", assigneeId: null, status: "done" },
      ),
    ).toBe(true);
    expect(
      canPatchWorkItem(
        "senior_developer",
        "senior-id",
        { assigneeId: null },
        { title: "Updated" },
      ),
    ).toBe(true);
  });

  it("allows an assignee to patch status only", () => {
    expect(
      canPatchWorkItem(
        "junior_developer",
        "junior-id",
        { assigneeId: "junior-id" },
        { status: "in_progress" },
      ),
    ).toBe(true);
  });

  it("denies an assignee patches containing fields other than status", () => {
    expect(
      canPatchWorkItem(
        "junior_developer",
        "junior-id",
        { assigneeId: "junior-id" },
        { status: "done", title: "Changed" },
      ),
    ).toBe(false);
    expect(
      canPatchWorkItem(
        "junior_developer",
        "junior-id",
        { assigneeId: "junior-id" },
        { assigneeId: null },
      ),
    ).toBe(false);
  });

  it("denies non-assignees", () => {
    expect(
      canPatchWorkItem(
        "junior_developer",
        "junior-id",
        { assigneeId: "other-id" },
        { status: "done" },
      ),
    ).toBe(false);
  });
});
