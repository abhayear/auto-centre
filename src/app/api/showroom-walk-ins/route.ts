import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseShowroomDateInput, serializeShowroomWalkIn } from "@/lib/showroom-walk-ins";
import { formatZodErrors, showroomWalkInSchema } from "@/lib/validators";

function buildDateFilter(from?: string | null, to?: string | null) {
  if (!from && !to) return undefined;

  const enquiryDate: { gte?: Date; lte?: Date } = {};
  if (from) enquiryDate.gte = parseShowroomDateInput(from);
  if (to) enquiryDate.lte = parseShowroomDateInput(to);

  return { enquiryDate };
}

function toCreateData(data: z.infer<typeof showroomWalkInSchema>) {
  return {
    enquiryDate: parseShowroomDateInput(data.enquiryDate),
    name: data.name.trim(),
    requiredModel: data.requiredModel.trim(),
    contactNumber: data.contactNumber?.trim() || null,
    address: data.address?.trim() || null,
    paymentMode: data.paymentMode ?? null,
    expectedPurchaseDate:
      data.expectedPurchaseDate && data.expectedPurchaseDate !== ""
        ? parseShowroomDateInput(data.expectedPurchaseDate)
        : null,
  };
}

export async function GET(request: NextRequest) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const records = await prisma.showroomWalkIn.findMany({
    where: buildDateFilter(from, to),
    orderBy: [{ enquiryDate: "desc" }, { createdAt: "desc" }],
  });

  return NextResponse.json(records.map(serializeShowroomWalkIn));
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const data = showroomWalkInSchema.parse(body);

    const record = await prisma.showroomWalkIn.create({
      data: toCreateData(data),
    });

    return NextResponse.json(serializeShowroomWalkIn(record), { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: formatZodErrors(error) },
        { status: 400 },
      );
    }
    return NextResponse.json({ error: "Failed to create walk-in enquiry" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { id, ...rest } = body;

    if (!id) {
      return NextResponse.json({ error: "Enquiry ID required" }, { status: 400 });
    }

    const data = showroomWalkInSchema.partial().parse(rest);

    const record = await prisma.showroomWalkIn.update({
      where: { id },
      data: {
        ...(data.enquiryDate ? { enquiryDate: parseShowroomDateInput(data.enquiryDate) } : {}),
        ...(data.name !== undefined ? { name: data.name.trim() } : {}),
        ...(data.requiredModel !== undefined
          ? { requiredModel: data.requiredModel.trim() }
          : {}),
        ...(data.contactNumber !== undefined
          ? { contactNumber: data.contactNumber?.trim() || null }
          : {}),
        ...(data.address !== undefined ? { address: data.address?.trim() || null } : {}),
        ...(data.paymentMode !== undefined ? { paymentMode: data.paymentMode ?? null } : {}),
        ...(data.expectedPurchaseDate !== undefined
          ? {
              expectedPurchaseDate:
                data.expectedPurchaseDate && data.expectedPurchaseDate !== ""
                  ? parseShowroomDateInput(data.expectedPurchaseDate)
                  : null,
            }
          : {}),
      },
    });

    return NextResponse.json(serializeShowroomWalkIn(record));
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: formatZodErrors(error) },
        { status: 400 },
      );
    }
    return NextResponse.json({ error: "Failed to update walk-in enquiry" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const id = request.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Enquiry ID required" }, { status: 400 });
  }

  try {
    await prisma.showroomWalkIn.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete walk-in enquiry" }, { status: 500 });
  }
}
