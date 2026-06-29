import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { MANAGER_ROLE } from "@/lib/admin-roles";
import { requireAdminRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createManagerSchema, formatZodErrors, updateManagerSchema } from "@/lib/validators";

export async function GET() {
  const session = await requireAdminRole();
  if (!session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const managers = await prisma.adminUser.findMany({
    where: { role: MANAGER_ROLE },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      email: true,
      active: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return NextResponse.json(managers);
}

export async function POST(request: NextRequest) {
  const session = await requireAdminRole();
  if (!session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const data = createManagerSchema.parse(body);

    const existing = await prisma.adminUser.findUnique({
      where: { email: data.email.toLowerCase().trim() },
    });
    if (existing) {
      return NextResponse.json(
        { error: "A user with this email already exists", details: [{ field: "email", message: "Email already in use" }] },
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(data.password, 12);
    const manager = await prisma.adminUser.create({
      data: {
        email: data.email.toLowerCase().trim(),
        passwordHash,
        role: MANAGER_ROLE,
        active: true,
      },
      select: {
        id: true,
        email: true,
        active: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json(manager, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: formatZodErrors(error) },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: "Failed to create manager" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const session = await requireAdminRole();
  if (!session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const data = updateManagerSchema.parse(body);

    const manager = await prisma.adminUser.findUnique({ where: { id: data.id } });
    if (!manager || manager.role !== MANAGER_ROLE) {
      return NextResponse.json({ error: "Manager not found" }, { status: 404 });
    }

    const updateData: { active?: boolean; passwordHash?: string } = {};
    if (typeof data.active === "boolean") {
      updateData.active = data.active;
    }
    if (data.password) {
      updateData.passwordHash = await bcrypt.hash(data.password, 12);
    }

    const updated = await prisma.adminUser.update({
      where: { id: data.id },
      data: updateData,
      select: {
        id: true,
        email: true,
        active: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: formatZodErrors(error) },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: "Failed to update manager" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const session = await requireAdminRole();
  if (!session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const id = request.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Manager id is required" }, { status: 400 });
  }

  const manager = await prisma.adminUser.findUnique({ where: { id } });
  if (!manager || manager.role !== MANAGER_ROLE) {
    return NextResponse.json({ error: "Manager not found" }, { status: 404 });
  }

  await prisma.adminUser.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
