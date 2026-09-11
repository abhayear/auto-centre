import { observeRoute } from "@/lib/health/observe-route";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireOpsPortal } from "@/lib/auth";
import {
  parseRecordDateInput,
  serializeCashBoxRecord,
  snapshotCashBoxRecord,
  summarizeCashBoxChange,
} from "@/lib/cash-box";
import { prisma } from "@/lib/prisma";
import { cashBoxRecordSchema, formatZodErrors } from "@/lib/validators";
import { Prisma } from "@prisma/client";

const recordInclude = {
  entries: { orderBy: [{ sortOrder: "asc" as const }, { createdAt: "asc" as const }] },
};

async function getHandler(request: NextRequest) {
  const session = await requireOpsPortal();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const limit = Number(request.nextUrl.searchParams.get("limit") ?? "60");
  const records = await prisma.cashBoxRecord.findMany({
    include: recordInclude,
    orderBy: [{ recordDate: "desc" }, { sessionNumber: "desc" }],
    take: Math.min(Math.max(limit, 1), 365),
  });

  return NextResponse.json(records.map(serializeCashBoxRecord));
}

async function postHandler(request: NextRequest) {
  const session = await requireOpsPortal();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const data = cashBoxRecordSchema.parse(body);
    const actorEmail = session.user.email ?? "unknown";
    const actorRole = session.user.role ?? null;

    const record = await prisma.$transaction(async (tx) => {
      const created = await tx.cashBoxRecord.create({
        data: {
          recordDate: parseRecordDateInput(data.recordDate),
          sessionNumber: data.sessionNumber,
          openingBalance: data.openingBalance,
          takenHome: data.takenHome,
          notes: data.notes?.trim() || null,
          entries: {
            create: data.entries.map((entry, index) => ({
              type: entry.type,
              category: entry.category,
              business: entry.business ?? null,
              paymentMethod: entry.paymentMethod ?? null,
              description: entry.description.trim(),
              amount: entry.amount,
              sortOrder: entry.sortOrder ?? index,
            })),
          },
        },
        include: recordInclude,
      });

      const after = snapshotCashBoxRecord(created);
      await tx.cashBoxAuditLog.create({
        data: {
          recordId: created.id,
          action: "created",
          actorEmail,
          actorRole,
          summary: summarizeCashBoxChange("created", null, after),
          afterJson: after as Prisma.InputJsonValue,
        },
      });

      return created;
    });

    return NextResponse.json(serializeCashBoxRecord(record), { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: formatZodErrors(error) },
        { status: 400 },
      );
    }
    if (error instanceof Error && error.message.includes("Unique constraint")) {
      return NextResponse.json(
        { error: "A cash box record already exists for this date and session" },
        { status: 409 },
      );
    }
    return NextResponse.json({ error: "Failed to create cash box record" }, { status: 500 });
  }
}

export const GET = observeRoute(getHandler);
export const POST = observeRoute(postHandler);
