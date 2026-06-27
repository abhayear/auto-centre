import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatZodErrors, serviceAreaSchema } from "@/lib/validators";

export async function GET(request: NextRequest) {
  const session = await requireAdmin();
  const all = request.nextUrl.searchParams.get("all") === "true";

  const areas = await prisma.serviceArea.findMany({
    where: session && all ? undefined : { active: true },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(areas);
}

export async function POST(request: NextRequest) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const data = serviceAreaSchema.parse(body);

    const area = await prisma.serviceArea.create({
      data: {
        name: data.name,
        pinCode: data.pinCode?.trim() || null,
        active: data.active,
      },
    });

    return NextResponse.json(area, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: formatZodErrors(error) },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: "Failed to create service area" }, { status: 500 });
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
      return NextResponse.json({ error: "Service area ID required" }, { status: 400 });
    }

    const data = serviceAreaSchema.partial().parse(rest);

    const area = await prisma.serviceArea.update({
      where: { id },
      data: {
        ...data,
        pinCode: data.pinCode === undefined ? undefined : data.pinCode?.trim() || null,
      },
    });

    return NextResponse.json(area);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: formatZodErrors(error) },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: "Failed to update service area" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const id = request.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Service area ID required" }, { status: 400 });
  }

  try {
    await prisma.serviceArea.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete service area" }, { status: 500 });
  }
}
