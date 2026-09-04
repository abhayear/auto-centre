import { observeRoute } from "@/lib/health/observe-route";
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { ADMIN_ROLE } from "@/lib/admin-roles";
import { requireAdminRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createStaffSchema, formatZodErrors, updateStaffSchema } from "@/lib/validators";

const staffSelect = {
  id: true,
  email: true,
  role: true,
  active: true,
  createdAt: true,
  updatedAt: true,
} as const;

async function countAdmins() {
  return prisma.adminUser.count({ where: { role: ADMIN_ROLE } });
}

async function getHandler() {
  const session = await requireAdminRole();
  if (!session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const staff = await prisma.adminUser.findMany({
    orderBy: { createdAt: "desc" },
    select: staffSelect,
  });

  return NextResponse.json(staff);
}

async function postHandler(request: NextRequest) {
  const session = await requireAdminRole();
  if (!session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const data = createStaffSchema.parse(body);

    const existing = await prisma.adminUser.findUnique({
      where: { email: data.email.toLowerCase().trim() },
    });
    if (existing) {
      return NextResponse.json(
        {
          error: "A user with this email already exists",
          details: [{ field: "email", message: "Email already in use" }],
        },
        { status: 409 },
      );
    }

    const passwordHash = await bcrypt.hash(data.password, 12);
    const staff = await prisma.adminUser.create({
      data: {
        email: data.email.toLowerCase().trim(),
        passwordHash,
        role: data.role,
        active: true,
      },
      select: staffSelect,
    });

    return NextResponse.json(staff, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: formatZodErrors(error) },
        { status: 400 },
      );
    }
    return NextResponse.json({ error: "Failed to create staff member" }, { status: 500 });
  }
}

async function patchHandler(request: NextRequest) {
  const session = await requireAdminRole();
  if (!session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const data = updateStaffSchema.parse(body);

    const user = await prisma.adminUser.findUnique({ where: { id: data.id } });
    if (!user) {
      return NextResponse.json({ error: "Staff member not found" }, { status: 404 });
    }

    const removingLastAdmin =
      user.role === ADMIN_ROLE &&
      ((typeof data.active === "boolean" && !data.active) ||
        (data.role !== undefined && data.role !== ADMIN_ROLE));

    if (removingLastAdmin && (await countAdmins()) <= 1) {
      return NextResponse.json(
        { error: "Cannot deactivate or reassign the last admin" },
        { status: 400 },
      );
    }

    const updateData: { active?: boolean; passwordHash?: string; role?: string } = {};
    if (typeof data.active === "boolean") {
      updateData.active = data.active;
    }
    if (data.password) {
      updateData.passwordHash = await bcrypt.hash(data.password, 12);
    }
    if (data.role) {
      updateData.role = data.role;
    }

    const updated = await prisma.adminUser.update({
      where: { id: data.id },
      data: updateData,
      select: staffSelect,
    });

    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: formatZodErrors(error) },
        { status: 400 },
      );
    }
    return NextResponse.json({ error: "Failed to update staff member" }, { status: 500 });
  }
}

async function deleteHandler(request: NextRequest) {
  const session = await requireAdminRole();
  if (!session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const id = request.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Staff id is required" }, { status: 400 });
  }

  const user = await prisma.adminUser.findUnique({ where: { id } });
  if (!user) {
    return NextResponse.json({ error: "Staff member not found" }, { status: 404 });
  }

  if (user.role === ADMIN_ROLE && (await countAdmins()) <= 1) {
    return NextResponse.json({ error: "Cannot delete the last admin" }, { status: 400 });
  }

  await prisma.adminUser.delete({ where: { id } });
  return NextResponse.json({ success: true });
}

export const GET = observeRoute(getHandler);
export const POST = observeRoute(postHandler);
export const PATCH = observeRoute(patchHandler);
export const DELETE = observeRoute(deleteHandler);
