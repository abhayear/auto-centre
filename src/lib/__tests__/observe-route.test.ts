import { beforeEach, describe, expect, it, vi } from "vitest";

const { recordMinuteBucket } = vi.hoisted(() => ({
  recordMinuteBucket: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/health/record-bucket", () => ({
  recordMinuteBucket,
}));

import { observeRoute } from "@/lib/health/observe-route";
import { onRequestError } from "@/instrumentation";

beforeEach(() => {
  recordMinuteBucket.mockClear();
});

describe("observeRoute", () => {
  it("records the returned status and elapsed duration", async () => {
    const dateNow = vi.spyOn(Date, "now").mockReturnValue(1_000);
    const handler = observeRoute(async () => new Response(null, { status: 201 }));

    const responsePromise = handler(
      new Request("https://example.com/api/bookings?source=test"),
      undefined,
    );
    dateNow.mockReturnValue(1_025);
    const response = await responsePromise;
    dateNow.mockRestore();

    expect(response.status).toBe(201);
    expect(recordMinuteBucket).toHaveBeenCalledWith({
      path: "/api/bookings",
      status: 201,
      durationMs: 25,
    });
  });

  it("records a 500 and rethrows handler errors", async () => {
    const error = new Error("boom");
    const handler = observeRoute(async () => {
      throw error;
    });

    await expect(
      handler(new Request("https://example.com/api/inquiries"), undefined),
    ).rejects.toBe(error);
    expect(recordMinuteBucket).toHaveBeenCalledWith({
      path: "/api/inquiries",
      status: 500,
      durationMs: expect.any(Number),
    });
  });

  it("passes dynamic route context through unchanged", async () => {
    const context = { params: Promise.resolve({ id: "booking-1" }) };
    const inner = vi.fn(async (_request: Request, receivedContext: typeof context) => {
      expect(receivedContext).toBe(context);
      return new Response();
    });
    const handler = observeRoute(inner);

    await handler(new Request("https://example.com/api/bookings/booking-1"), context);

    expect(inner).toHaveBeenCalledOnce();
  });
});

describe("onRequestError", () => {
  it.each(["/api/bookings", "/api/ops/health-check"])(
    "skips API path %s",
    async (path) => {
      await onRequestError(
        new Error("route failed"),
        { path, method: "GET", headers: {} },
        {
          routerKind: "App Router",
          routePath: path,
          routeType: "route",
          revalidateReason: undefined,
        },
      );

      expect(recordMinuteBucket).not.toHaveBeenCalled();
    },
  );

  it.each([
    "/api/auth",
    "/api/auth/session",
    "/api/auth/callback/credentials",
    "/vehicles",
  ])("records a zero-duration 500 bucket for path %s", async (path) => {
    await onRequestError(
      new Error("render failed"),
      { path, method: "GET", headers: {} },
      {
        routerKind: "App Router",
        routePath: path,
        routeType: "route",
        revalidateReason: undefined,
      },
    );

    expect(recordMinuteBucket).toHaveBeenCalledWith({
      path,
      status: 500,
      durationMs: 0,
    });
  });
});
