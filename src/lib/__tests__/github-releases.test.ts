import { describe, expect, it, vi } from "vitest";
import {
  listOpenPullRequests,
  mergePullRequest,
} from "@/lib/github/releases";

const headers = {
  Authorization: "Bearer secret",
  Accept: "application/vnd.github+json",
};

describe("listOpenPullRequests", () => {
  it("fetches open master pull requests and maps GitHub fields", async () => {
    const fetchFn = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [
        {
          number: 42,
          title: "Ship release",
          html_url: "https://github.com/acme/app/pull/42",
          user: { login: "octocat" },
          body: null,
          mergeable: null,
        },
      ],
    }) as unknown as typeof fetch;

    await expect(
      listOpenPullRequests({ repo: "acme/app", token: "secret", fetchFn }),
    ).resolves.toEqual([
      {
        number: 42,
        title: "Ship release",
        htmlUrl: "https://github.com/acme/app/pull/42",
        author: "octocat",
        previewUrl: null,
        mergeable: null,
      },
    ]);
    expect(fetchFn).toHaveBeenCalledWith(
      "https://api.github.com/repos/acme/app/pulls?state=open&base=master",
      { method: "GET", headers },
    );
  });

  it("extracts the first HTTPS Vercel preview URL from the body", async () => {
    const fetchFn = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [
        {
          number: 7,
          title: "Preview",
          html_url: "https://github.com/acme/app/pull/7",
          user: { login: "developer" },
          body:
            "Ignore https://example.com, use https://first-preview.vercel.app/path then https://second.vercel.app",
          mergeable: true,
        },
      ],
    }) as unknown as typeof fetch;

    const [pullRequest] = await listOpenPullRequests({
      repo: "acme/app",
      token: "secret",
      fetchFn,
    });

    expect(pullRequest.previewUrl).toBe(
      "https://first-preview.vercel.app/path",
    );
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it("throws the response status text when listing fails", async () => {
    const fetchFn = vi.fn().mockResolvedValue({
      ok: false,
      statusText: "Forbidden",
    }) as unknown as typeof fetch;

    await expect(
      listOpenPullRequests({ repo: "acme/app", token: "secret", fetchFn }),
    ).rejects.toThrow("Forbidden");
  });
});

describe("mergePullRequest", () => {
  it("returns the response text when GitHub rejects the merge", async () => {
    const fetchFn = vi.fn().mockResolvedValue({
      ok: false,
      text: async () => "Pull Request is not mergeable",
    }) as unknown as typeof fetch;

    await expect(
      mergePullRequest({
        repo: "acme/app",
        token: "secret",
        number: 42,
        fetchFn,
      }),
    ).resolves.toEqual({
      merged: false,
      message: "Pull Request is not mergeable",
    });
    expect(fetchFn).toHaveBeenCalledWith(
      "https://api.github.com/repos/acme/app/pulls/42/merge",
      {
        method: "PUT",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ merge_method: "merge" }),
      },
    );
  });

  it("returns GitHub's success message or the merged fallback", async () => {
    const withMessage = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ message: "Pull Request successfully merged" }),
    }) as unknown as typeof fetch;
    const withoutMessage = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({}),
    }) as unknown as typeof fetch;

    await expect(
      mergePullRequest({
        repo: "acme/app",
        token: "secret",
        number: 1,
        fetchFn: withMessage,
      }),
    ).resolves.toEqual({
      merged: true,
      message: "Pull Request successfully merged",
    });
    await expect(
      mergePullRequest({
        repo: "acme/app",
        token: "secret",
        number: 2,
        fetchFn: withoutMessage,
      }),
    ).resolves.toEqual({ merged: true, message: "merged" });
  });
});
