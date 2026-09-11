import { observeRoute } from "@/lib/health/observe-route";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireOpsPortal, requireAdminRole } from "@/lib/auth";
import {
  parseRecordDateInput,
  serializeCashBoxRecord,
  snapshotCashBoxRecord,
  summarizeCashBoxChange,
} from "@/lib/cash-box";
import { prisma } from "@/lib/prisma";
import { cashBoxRecordSchema, formatZodErrors } from "@/lib/validators";
import { Prisma } from "@prisma/client";

type RouteParams = { params: Promise<{ id: string }> };

const recordInclude = {
  entries: { orderBy: [{ sortOrder: "asc" as const }, { createdAt: "asc" as const }] },
};

const recordWithHistoryInclude = {
  ...recordInclude,
  auditLogs: { orderBy: { createdAt: "desc" as const } },
};

async function getHandler(_request: NextRequest, { params }: RouteParams) {
  const session = await requireOpsPortal();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const record = await prisma.cashBoxRecord.findUnique({
    where: { id },
    include: recordWithHistoryInclude,
  });

  if (!record) {
    return NextResponse.json({ error: "Record not found" }, { status: 404 });
  }

  return NextResponse.json(serializeCashBoxRecord(record));
}

async function patchHandler(request: NextRequest, { params }: RouteParams) {
  const session = await requireAdminRole();
  if (!session) {
    return NextResponse.json({ error: "Only admins can edit cash box records" }, { status: 403 });
  }

  const { id } = await params;
  const actorEmail = session.user.email ?? "unknown";
  const actorRole = session.user.role ?? null;

  try {
    const body = await request.json();
    const data = cashBoxRecordSchema.partial().parse(body);

    const existing = await prisma.cashBoxRecord.findUnique({
      where: { id },
      include: recordInclude,
    });
    if (!existing) {
      return NextResponse.json({ error: "Record not found" }, { status: 404 });
    }

    const record = await prisma.$transaction(async (tx) => {
      if (data.entries) {
        await tx.cashBoxEntry.deleteMany({ where: { recordId: id } });
      }

      const updated = await tx.cashBoxRecord.update({
        where: { id },
        data: {
          ...(data.recordDate ? { recordDate: parseRecordDateInput(data.recordDate) } : {}),
          ...(data.sessionNumber !== undefined ? { sessionNumber: data.sessionNumber } : {}),
          ...(data.openingBalance !== undefined ? { openingBalance: data.openingBalance } : {}),
          ...(data.takenHome !== undefined ? { takenHome: data.takenHome } : {}),
          ...(data.notes !== undefined ? { notes: data.notes?.trim() || null } : {}),
          ...(data.entries
            ? {
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
              }
            : {}),
        },
        include: recordInclude,
      });

      const before = snapshotCashBoxRecord(existing);
      const after = snapshotCashBoxRecord(updated);
      await tx.cashBoxAuditLog.create({
        data: {
          recordId: id,
          action: "updated",
          actorEmail,
          actorRole,
          summary: summarizeCashBoxChange("updated", before, after),
          beforeJson: before as Prisma.InputJsonValue,
          afterJson: after as Prisma.InputJsonValue,
        },
      });

      return updated;
    });

    return NextResponse.json(serializeCashBoxRecord(record));
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
    return NextResponse.json({ error: "Failed to update cash box record" }, { status: 500 });
  }
}

async function deleteHandler(_request: NextRequest, { params }: RouteParams) {
  const session = await requireAdminRole();
  if (!session) {
    return NextResponse.json({ error: "Only admins can delete cash box records" }, { status: 403 });
  }

  const { id } = await params;
  const actorEmail = session.user.email ?? "unknown";
  const actorRole = session.user.role ?? null;

  try {
    const existing = await prisma.cashBoxRecord.findUnique({
      where: { id },
      include: recordInclude,
    });
    if (!existing) {
      return NextResponse.json({ error: "Record not found" }, { status: 404 });
    }

    const before = snapshotCashBoxRecord(existing);
    await prisma.$transaction(async (tx) => {
      await tx.cashBoxAuditLog.create({
        data: {
          recordId: id,
          action: "deleted",
          actorEmail,
          actorRole,
          summary: summarizeCashBoxChange("deleted", before, null),
          beforeJson: before as Prisma.InputJsonValue,
        },
      });
      await tx.cashBoxRecord.delete({ where: { id } });
    });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete record" }, { status: 500 });
  }
}

export const GET = observeRoute(getHandler);
export const PATCH = observeRoute(patchHandler);
export const DELETE = observeRoute(deleteHandler);
