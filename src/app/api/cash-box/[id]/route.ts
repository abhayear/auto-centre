import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin, requireAdminRole } from "@/lib/auth";
import { computeCashBoxTotals, parseRecordDateInput } from "@/lib/cash-box";
import { prisma } from "@/lib/prisma";
import { cashBoxRecordSchema, formatZodErrors } from "@/lib/validators";

type RouteParams = { params: Promise<{ id: string }> };

function serializeRecord(
  record: {
    id: string;
    recordDate: Date;
    sessionNumber: number;
    openingBalance: number;
    takenHome: number;
    notes: string | null;
    createdAt: Date;
    updatedAt: Date;
    entries: {
      id: string;
      type: string;
      category: string;
      business: string | null;
      paymentMethod: string | null;
      description: string;
      amount: number;
      sortOrder: number;
    }[];
  },
) {
  const totals = computeCashBoxTotals(record.openingBalance, record.takenHome, record.entries.map((entry) => ({
    type: entry.type as "receipt" | "payment",
    amount: entry.amount,
    paymentMethod: entry.paymentMethod as "cash" | "phonepay" | "other" | null | undefined,
  })));
  return {
    ...record,
    recordDate: record.recordDate.toISOString().slice(0, 10),
    ...totals,
  };
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const record = await prisma.cashBoxRecord.findUnique({
    where: { id },
    include: { entries: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] } },
  });

  if (!record) {
    return NextResponse.json({ error: "Record not found" }, { status: 404 });
  }

  return NextResponse.json(serializeRecord(record));
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const session = await requireAdminRole();
  if (!session) {
    return NextResponse.json({ error: "Only admins can edit cash box records" }, { status: 403 });
  }

  const { id } = await params;

  try {
    const body = await request.json();
    const data = cashBoxRecordSchema.partial().parse(body);

    const existing = await prisma.cashBoxRecord.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Record not found" }, { status: 404 });
    }

    const record = await prisma.$transaction(async (tx) => {
      if (data.entries) {
        await tx.cashBoxEntry.deleteMany({ where: { recordId: id } });
      }

      return tx.cashBoxRecord.update({
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
        include: { entries: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] } },
      });
    });

    return NextResponse.json(serializeRecord(record));
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

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const session = await requireAdminRole();
  if (!session) {
    return NextResponse.json({ error: "Only admins can delete cash box records" }, { status: 403 });
  }

  const { id } = await params;

  try {
    await prisma.cashBoxRecord.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete record" }, { status: 500 });
  }
}
