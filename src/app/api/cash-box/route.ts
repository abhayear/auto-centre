import { observeRoute } from "@/lib/health/observe-route";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { computeCashBoxTotals, parseRecordDateInput } from "@/lib/cash-box";
import { prisma } from "@/lib/prisma";
import { cashBoxRecordSchema, formatZodErrors } from "@/lib/validators";

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

 async function getHandler(request: NextRequest) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const limit = Number(request.nextUrl.searchParams.get("limit") ?? "60");
  const records = await prisma.cashBoxRecord.findMany({
    include: { entries: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] } },
    orderBy: [{ recordDate: "desc" }, { sessionNumber: "desc" }],
    take: Math.min(Math.max(limit, 1), 365),
  });

  return NextResponse.json(records.map(serializeRecord));
}

 async function postHandler(request: NextRequest) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const data = cashBoxRecordSchema.parse(body);

    const record = await prisma.cashBoxRecord.create({
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
      include: { entries: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] } },
    });

    return NextResponse.json(serializeRecord(record), { status: 201 });
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
