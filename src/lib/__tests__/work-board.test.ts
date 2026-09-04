import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { useSession } = vi.hoisted(() => ({
  useSession: vi.fn(),
}));

vi.mock("next-auth/react", () => ({ useSession }));

import { WorkBoard } from "@/components/admin/WorkBoard";

describe("WorkBoard role controls", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows work creation to assigners", () => {
    useSession.mockReturnValue({
      data: {
        user: {
          id: "senior-id",
          email: "senior@example.com",
          role: "senior_developer",
        },
      },
      status: "authenticated",
    });

    const html = renderToStaticMarkup(createElement(WorkBoard));

    expect(html).toContain("Assign Work");
  });

  it("does not show work creation to junior developers", () => {
    useSession.mockReturnValue({
      data: {
        user: {
          id: "junior-id",
          email: "junior@example.com",
          role: "junior_developer",
        },
      },
      status: "authenticated",
    });

    const html = renderToStaticMarkup(createElement(WorkBoard));

    expect(html).toContain("Your assigned work");
    expect(html).not.toContain("Assign Work");
  });
});
