import { Prisma } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";
import { isDbConnectionError, safeDbQuery } from "@/lib/safe-db";

describe("isDbConnectionError", () => {
  it("detects PrismaClientInitializationError", () => {
    const error = new Prisma.PrismaClientInitializationError(
      "Can't reach database server",
      "P1001"
    );
    expect(isDbConnectionError(error)).toBe(true);
  });

  it("detects connection refused message", () => {
    expect(isDbConnectionError(new Error("Can't reach database server at localhost:5433"))).toBe(
      true
    );
  });

  it("returns false for unrelated errors", () => {
    expect(isDbConnectionError(new Error("Something else"))).toBe(false);
  });
});

describe("safeDbQuery", () => {
  it("returns fallback in development when database is unreachable", async () => {
    vi.stubEnv("NODE_ENV", "development");

    const result = await safeDbQuery(
      () =>
        Promise.reject(
          new Prisma.PrismaClientInitializationError("Can't reach database server", "P1001")
        ),
      []
    );

    expect(result).toEqual([]);
    vi.unstubAllEnvs();
  });

  it("returns fallback in production when database is unreachable", async () => {
    vi.stubEnv("NODE_ENV", "production");

    const result = await safeDbQuery(
      () =>
        Promise.reject(
          new Prisma.PrismaClientInitializationError("Can't reach database server", "P1001")
        ),
      []
    );

    expect(result).toEqual([]);
    vi.unstubAllEnvs();
  });

  it("returns fallback when a column is missing", async () => {
    const error = new Prisma.PrismaClientKnownRequestError("Column not found", {
      code: "P2022",
      clientVersion: "6.19.3",
    });

    const result = await safeDbQuery(() => Promise.reject(error), []);
    expect(result).toEqual([]);
  });
});
