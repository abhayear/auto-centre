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

function isRecoverableDbQueryError(error: unknown): boolean {
  if (isDbConnectionError(error)) return true;
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    // P2022: column/table missing (schema drift), P2021: table does not exist
    return error.code === "P2022" || error.code === "P2021";
  }
  if (error instanceof Error) {
    return (
      error.message.includes("does not exist") ||
      error.message.includes("column") && error.message.includes("not exist")
    );
  }
  return false;
}

/** Run a Prisma query; return fallback when DB is offline or schema is out of sync. */
export async function safeDbQuery<T>(
  query: () => Promise<T>,
  fallback: T
): Promise<T> {
  try {
    return await query();
  } catch (error) {
    if (isRecoverableDbQueryError(error)) {
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
