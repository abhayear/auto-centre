import type { Instrumentation } from "next";
import { recordMinuteBucket } from "@/lib/health/record-bucket";

export function register(): void {}

export const onRequestError: Instrumentation.onRequestError = async (
  _error,
  request,
) => {
  try {
    const path = new URL(request.path, "http://localhost").pathname;
    const isAuthApiPath = path === "/api/auth" || path.startsWith("/api/auth/");
    if (path.startsWith("/api/") && !isAuthApiPath) {
      return;
    }

    await recordMinuteBucket({ path, status: 500, durationMs: 0 });
  } catch {
    // Instrumentation must never interfere with the request path.
  }
};
