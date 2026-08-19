import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { runHealthCheck } = vi.hoisted(() => ({
  runHealthCheck: vi.fn(),
}));

vi.mock("@/lib/health/run-health-check", () => ({ runHealthCheck }));

import { GET, POST } from "@/app/api/ops/health-check/route";

describe("/api/ops/health-check", () => {
  beforeEach(() => {
    vi.stubEnv("CRON_SECRET", "cron-secret");
    runHealthCheck.mockResolvedValue({
      overallStatus: "ok",
      signals: [],
      emailSkipped: null,
      emailed: false,
    });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });

  it.each([GET, POST])("rejects a missing or incorrect Bearer secret", async (handler) => {
    const missing = await handler(new Request("https://example.com/api/ops/health-check"));
    const incorrect = await handler(
      new Request("https://example.com/api/ops/health-check", {
        headers: { authorization: "Bearer wrong-secret" },
      }),
    );

    expect(missing.status).toBe(401);
    expect(incorrect.status).toBe(401);
    await expect(missing.json()).resolves.toEqual({ error: "Unauthorized" });
    expect(runHealthCheck).not.toHaveBeenCalled();
  });

  it("rejects every caller when CRON_SECRET is unset", async () => {
    vi.stubEnv("CRON_SECRET", "");

    const response = await GET(
      new Request("https://example.com/api/ops/health-check", {
        headers: { authorization: "Bearer " },
      }),
    );

    expect(response.status).toBe(401);
    expect(runHealthCheck).not.toHaveBeenCalled();
  });

  it("maps digest and a supported health source", async () => {
    const response = await GET(
      new Request("https://example.com/api/ops/health-check?digest=1", {
        headers: {
          authorization: "Bearer cron-secret",
          "x-health-source": "github-actions",
        },
      }),
    );

    expect(response.status).toBe(200);
    expect(runHealthCheck).toHaveBeenCalledWith({
      source: "github-actions",
      digest: true,
    });
  });

  it("defaults an unsupported source to vercel-cron", async () => {
    await POST(
      new Request("https://example.com/api/ops/health-check?digest=0", {
        method: "POST",
        headers: {
          authorization: "Bearer cron-secret",
          "x-health-source": "unknown",
        },
      }),
    );

    expect(runHealthCheck).toHaveBeenCalledWith({
      source: "vercel-cron",
      digest: false,
    });
  });

  it("returns JSON when the health check fails unexpectedly", async () => {
    runHealthCheck.mockRejectedValueOnce(new Error("unexpected"));

    const response = await POST(
      new Request("https://example.com/api/ops/health-check", {
        method: "POST",
        headers: { authorization: "Bearer cron-secret" },
      }),
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: "health_check_failed" });
  });
});
