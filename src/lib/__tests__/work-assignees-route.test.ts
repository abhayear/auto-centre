import { beforeEach, describe, expect, it, vi } from "vitest";

const { findMany, requireStaffSession } = vi.hoisted(() => ({
  findMany: vi.fn(),
  requireStaffSession: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ requireStaffSession }));
vi.mock("@/lib/prisma", () => ({
  prisma: { adminUser: { findMany } },
}));
vi.mock("@/lib/health/observe-route", () => ({
  observeRoute: <T>(handler: T) => handler,
}));

import { GET } from "@/app/api/work/assignees/route";

describe("/api/work/assignees", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireStaffSession.mockResolvedValue({
      user: { id: "senior-id", role: "senior_developer" },
    });
    findMany.mockResolvedValue([
      {
        id: "junior-id",
        email: "junior@example.com",
        role: "junior_developer",
      },
    ]);
  });

  it("returns only safe fields for active staff to work assigners", async () => {
    const response = await GET(
      new Request("https://example.com/api/work/assignees"),
      undefined,
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual([
      {
        id: "junior-id",
        email: "junior@example.com",
        role: "junior_developer",
      },
    ]);
    expect(findMany).toHaveBeenCalledWith({
      where: {
        active: true,
        role: {
          in: ["admin", "senior_developer", "junior_developer"],
        },
      },
      orderBy: { email: "asc" },
      select: { id: true, email: true, role: true },
    });
  });

  it("forbids junior developers", async () => {
    requireStaffSession.mockResolvedValue({
      user: { id: "junior-id", role: "junior_developer" },
    });

    const response = await GET(
      new Request("https://example.com/api/work/assignees"),
      undefined,
    );

    expect(response.status).toBe(403);
    expect(findMany).not.toHaveBeenCalled();
  });

  it("forbids requests without a staff session", async () => {
    requireStaffSession.mockResolvedValue(null);

    const response = await GET(
      new Request("https://example.com/api/work/assignees"),
      undefined,
    );

    expect(response.status).toBe(403);
    expect(findMany).not.toHaveBeenCalled();
  });
});
