import { afterEach, describe, expect, it, vi } from "vitest";
import {
  fetchVercelUsagePercent,
  maxPercent,
  parseMaxConnections,
  pingUrl,
  readDatabaseConnections,
} from "@/lib/health/collectors";

afterEach(() => {
  vi.useRealTimers();
});

describe("pingUrl", () => {
  it("aborts after 5000ms and classifies the timeout as a failed ping", async () => {
    vi.useFakeTimers();
    const fetchFn = vi.fn((_url: string | URL | Request, init?: RequestInit) => {
      return new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => reject(new Error("aborted")));
      });
    }) as typeof fetch;

    const resultPromise = pingUrl("https://example.com", 5000, fetchFn);
    await vi.advanceTimersByTimeAsync(5000);

    await expect(resultPromise).resolves.toEqual({ ok: false, ms: 5000, status: null });
    expect(fetchFn).toHaveBeenCalledWith("https://example.com", {
      signal: expect.any(AbortSignal),
      redirect: "manual",
    });
  });

  it.each([
    [200, true],
    [399, true],
    [400, false],
  ])("classifies HTTP status %i", async (status, ok) => {
    const fetchFn = vi.fn().mockResolvedValue({ status }) as unknown as typeof fetch;

    await expect(pingUrl("https://example.com", 5000, fetchFn)).resolves.toMatchObject({
      ok,
      status,
    });
  });

  it("returns a failed ping when fetch throws", async () => {
    const fetchFn = vi.fn().mockRejectedValue(new Error("network failed")) as unknown as typeof fetch;

    await expect(pingUrl("https://example.com", 5000, fetchFn)).resolves.toMatchObject({
      ok: false,
      status: null,
    });
  });
});

describe("maxPercent", () => {
  it("returns the largest quota usage percentage", () => {
    expect(
      maxPercent([
        { used: 80, limit: 100 },
        { used: 10, limit: 100 },
      ]),
    ).toBe(80);
  });

  it("returns null for no quotas and treats non-positive limits as zero percent", () => {
    expect(maxPercent([])).toBeNull();
    expect(maxPercent([{ used: 10, limit: 0 }])).toBe(0);
  });
});

describe("parseMaxConnections", () => {
  it("parses the string returned by SHOW max_connections", () => {
    expect(parseMaxConnections("100")).toBe(100);
    expect(parseMaxConnections([{ max_connections: "100" }])).toBe(100);
  });

  it("returns null for an invalid result", () => {
    expect(parseMaxConnections([{ max_connections: "invalid" }])).toBeNull();
    expect(parseMaxConnections([])).toBeNull();
  });
});

describe("fetchVercelUsagePercent", () => {
  it("returns unconfigured without fetching when the token is missing", async () => {
    const fetchFn = vi.fn() as unknown as typeof fetch;

    await expect(fetchVercelUsagePercent({}, fetchFn)).resolves.toEqual({
      configured: false,
      percent: null,
    });
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it("fetches Vercel usage and returns the maximum quota percentage", async () => {
    const fetchFn = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        quotas: [
          { used: 25, limit: 100 },
          { used: 90, limit: 100 },
        ],
      }),
    }) as unknown as typeof fetch;

    await expect(
      fetchVercelUsagePercent({ VERCEL_API_TOKEN: "secret" }, fetchFn),
    ).resolves.toEqual({ configured: true, percent: 90 });
    expect(fetchFn).toHaveBeenCalledWith("https://api.vercel.com/v1/usage", {
      headers: { Authorization: "Bearer secret" },
    });
  });

  it.each([
    { ok: false, json: async () => ({ quotas: [] }) },
    { ok: true, json: async () => ({ quotas: "invalid" }) },
  ])("returns collector failed for a failed response or parse", async (response) => {
    const fetchFn = vi.fn().mockResolvedValue(response) as unknown as typeof fetch;

    await expect(
      fetchVercelUsagePercent({ VERCEL_API_TOKEN: "secret" }, fetchFn),
    ).resolves.toEqual({
      configured: true,
      percent: null,
      error: "collector failed",
    });
  });
});

describe("readDatabaseConnections", () => {
  it("reads current and maximum PostgreSQL connections", async () => {
    const queries: string[] = [];
    const queryRaw = vi.fn(async (query: TemplateStringsArray) => {
      const sql = query.join("");
      queries.push(sql);
      return sql.startsWith("SELECT")
        ? [{ count: 12 }]
        : [{ max_connections: "100" }];
    });

    await expect(readDatabaseConnections(queryRaw)).resolves.toEqual({
      connections: 12,
      maxConnections: 100,
    });
    expect(queries).toEqual([
      "SELECT count(*)::int AS count FROM pg_stat_activity",
      "SHOW max_connections",
    ]);
  });

  it("returns collector failed when a query fails", async () => {
    const queryRaw = vi.fn().mockRejectedValue(new Error("database failed"));

    await expect(readDatabaseConnections(queryRaw)).resolves.toEqual({
      connections: null,
      maxConnections: null,
      error: "collector failed",
    });
  });
});
