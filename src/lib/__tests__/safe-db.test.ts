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

  it("rethrows in production", async () => {
    vi.stubEnv("NODE_ENV", "production");

    await expect(
      safeDbQuery(
        () =>
          Promise.reject(
            new Prisma.PrismaClientInitializationError("Can't reach database server", "P1001")
          ),
        []
      )
    ).rejects.toBeInstanceOf(Prisma.PrismaClientInitializationError);

    vi.unstubAllEnvs();
  });
});
