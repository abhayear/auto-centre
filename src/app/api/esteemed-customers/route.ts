import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePublicSitePages } from "@/lib/revalidate";
import { esteemedCustomerSchema, formatZodErrors } from "@/lib/validators";

export async function GET(request: NextRequest) {
  const session = await requireAdmin();
  const all = request.nextUrl.searchParams.get("all") === "true";

  const customers = await prisma.esteemedCustomer.findMany({
    where: session && all ? undefined : { active: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });

  return NextResponse.json(customers);
}

export async function POST(request: NextRequest) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const data = esteemedCustomerSchema.parse(body);

    const customer = await prisma.esteemedCustomer.create({
      data: {
        name: data.name.trim(),
        designation: data.designation?.trim() || null,
        locality: data.locality?.trim() || null,
        vehicle: data.vehicle?.trim() || null,
        note: data.note?.trim() || null,
        sortOrder: data.sortOrder,
        active: data.active,
      },
    });

    revalidatePublicSitePages();

    return NextResponse.json(customer, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: formatZodErrors(error) },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: "Failed to create customer" }, { status: 500 });
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
      return NextResponse.json({ error: "Customer ID required" }, { status: 400 });
    }

    const data = esteemedCustomerSchema.partial().parse(rest);

    const customer = await prisma.esteemedCustomer.update({
      where: { id },
      data: {
        ...data,
        name: data.name?.trim(),
        designation:
          data.designation === undefined ? undefined : data.designation?.trim() || null,
        locality: data.locality === undefined ? undefined : data.locality?.trim() || null,
        vehicle: data.vehicle === undefined ? undefined : data.vehicle?.trim() || null,
        note: data.note === undefined ? undefined : data.note?.trim() || null,
      },
    });

    revalidatePublicSitePages();

    return NextResponse.json(customer);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: formatZodErrors(error) },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: "Failed to update customer" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const id = request.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Customer ID required" }, { status: 400 });
  }

  try {
    await prisma.esteemedCustomer.delete({ where: { id } });
    revalidatePublicSitePages();
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete customer" }, { status: 500 });
  }
}
