import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { listOpenPullRequests, mergePullRequest, requireStaffSession } =
  vi.hoisted(() => ({
    listOpenPullRequests: vi.fn(),
    mergePullRequest: vi.fn(),
    requireStaffSession: vi.fn(),
  }));

vi.mock("@/lib/auth", () => ({ requireStaffSession }));
vi.mock("@/lib/github/releases", () => ({
  listOpenPullRequests,
  mergePullRequest,
}));
vi.mock("@/lib/health/observe-route", () => ({
  observeRoute: <T>(handler: T) => handler,
}));

import { GET, POST } from "@/app/api/releases/route";

const request = (method = "GET", body?: unknown) =>
  new Request("https://example.com/api/releases", {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });

describe("/api/releases", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireStaffSession.mockResolvedValue({
      user: { id: "senior-id", role: "senior_developer" },
    });
    listOpenPullRequests.mockResolvedValue([
      {
        number: 42,
        title: "Ship releases",
        htmlUrl: "https://github.com/abhayear/auto-centre/pull/42",
        author: "developer",
        previewUrl: "https://preview.vercel.app",
        mergeable: true,
      },
    ]);
    mergePullRequest.mockResolvedValue({
      merged: true,
      message: "Pull Request successfully merged",
    });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("forbids staff without release viewing access", async () => {
    requireStaffSession.mockResolvedValue({
      user: { id: "manager-id", role: "manager" },
    });

    const response = await GET(request(), undefined);

    expect(response.status).toBe(403);
    expect(listOpenPullRequests).not.toHaveBeenCalled();
  });

  it("returns an unconfigured empty list without calling GitHub", async () => {
    vi.stubEnv("GITHUB_RELEASES_TOKEN", "");

    const response = await GET(request(), undefined);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      configured: false,
      pullRequests: [],
    });
    expect(listOpenPullRequests).not.toHaveBeenCalled();
  });

  it("lists open pull requests using the default repository", async () => {
    vi.stubEnv("GITHUB_RELEASES_TOKEN", "secret-token");
    vi.stubEnv("GITHUB_REPO", "");

    const response = await GET(request(), undefined);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      configured: true,
      pullRequests: expect.arrayContaining([
        expect.objectContaining({ number: 42 }),
      ]),
    });
    expect(listOpenPullRequests).toHaveBeenCalledWith({
      repo: "abhayear/auto-centre",
      token: "secret-token",
    });
  });

  it("returns a bad gateway response when listing pull requests fails", async () => {
    vi.stubEnv("GITHUB_RELEASES_TOKEN", "secret-token");
    listOpenPullRequests.mockRejectedValue(new Error("Forbidden"));

    const response = await GET(request(), undefined);

    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toEqual({
      error: "GitHub request failed",
      message: "Forbidden",
    });
  });

  it("forbids staff without release merge access", async () => {
    vi.stubEnv("GITHUB_RELEASES_TOKEN", "secret-token");
    requireStaffSession.mockResolvedValue({
      user: { id: "junior-id", role: "junior_developer" },
    });

    const response = await POST(request("POST", { number: 42 }), undefined);

    expect(response.status).toBe(403);
    expect(mergePullRequest).not.toHaveBeenCalled();
  });

  it.each([0, -1, 1.5, "42", null])(
    "rejects an invalid pull request number: %j",
    async (number) => {
      vi.stubEnv("GITHUB_RELEASES_TOKEN", "secret-token");

      const response = await POST(request("POST", { number }), undefined);

      expect(response.status).toBe(400);
      expect(mergePullRequest).not.toHaveBeenCalled();
    },
  );

  it("rejects a merge when GitHub releases are not configured", async () => {
    vi.stubEnv("GITHUB_RELEASES_TOKEN", "");

    const response = await POST(request("POST", { number: 1 }), undefined);

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      error: "GitHub releases are not configured",
    });
    expect(mergePullRequest).not.toHaveBeenCalled();
  });

  it("returns a bad gateway response when GitHub does not merge", async () => {
    vi.stubEnv("GITHUB_RELEASES_TOKEN", "secret-token");
    mergePullRequest.mockResolvedValue({
      merged: false,
      message: "Branch protection rejected the merge",
    });

    const response = await POST(request("POST", { number: 42 }), undefined);

    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toEqual({
      error: "Merge failed",
      message: "Branch protection rejected the merge",
    });
  });

  it("merges a pull request using the configured repository", async () => {
    vi.stubEnv("GITHUB_RELEASES_TOKEN", "secret-token");
    vi.stubEnv("GITHUB_REPO", "owner/project");

    const response = await POST(request("POST", { number: 42 }), undefined);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      merged: true,
      message: "Pull Request successfully merged",
    });
    expect(mergePullRequest).toHaveBeenCalledWith({
      repo: "owner/project",
      token: "secret-token",
      number: 42,
    });
  });
});
