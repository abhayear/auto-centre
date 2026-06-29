import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export function isDbConnectionError(error: unknown): boolean {
  if (error instanceof Prisma.PrismaClientInitializationError) {
    return true;
  }
  if (error instanceof Error) {
    return (
      error.message.includes("Can't reach database server") ||
      error.message.includes("Connection refused")
    );
  }
  return false;
}

/** Run a Prisma query; in development, return fallback when Postgres is offline. */
export async function safeDbQuery<T>(
  query: () => Promise<T>,
  fallback: T
): Promise<T> {
  try {
    return await query();
  } catch (error) {
    if (process.env.NODE_ENV === "development" && isDbConnectionError(error)) {
      return fallback;
    }
    throw error;
  }
}

export async function isDatabaseAvailable(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch {
    return false;
  }
}
