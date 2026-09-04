import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { canAssignWork } from "@/lib/admin-roles";
import { requireStaffSession } from "@/lib/auth";
import { observeRoute } from "@/lib/health/observe-route";
import { prisma } from "@/lib/prisma";
import {
  createWorkItemSchema,
  formatZodErrors,
  patchWorkItemSchema,
} from "@/lib/validators";
import { canPatchWorkItem, canViewWorkItem } from "@/lib/work-access";

function forbidden() {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

async function getHandler() {
  const session = await requireStaffSession();
  if (!session) return forbidden();

  const role = session.user.role;
  if (!canAssignWork(role) && role !== "junior_developer") {
    return forbidden();
  }

  const items = await prisma.staffWorkItem.findMany({
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(
    items.filter((item) =>
      canViewWorkItem(role, session.user.id, item),
    ),
  );
}

async function postHandler(request: NextRequest) {
  const session = await requireStaffSession();
  if (!session || !canAssignWork(session.user.role)) {
    return forbidden();
  }

  try {
    const data = createWorkItemSchema.parse(await request.json());
    const item = await prisma.staffWorkItem.create({
      data: {
        ...data,
        createdById: session.user.id,
      },
    });

    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: formatZodErrors(error) },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { error: "Failed to create work item" },
      { status: 500 },
    );
  }
}

async function patchHandler(request: NextRequest) {
  const session = await requireStaffSession();
  if (!session) return forbidden();

  try {
    const { id, ...patch } = patchWorkItemSchema.parse(await request.json());
    const item = await prisma.staffWorkItem.findUnique({
      where: { id },
      select: { assigneeId: true },
    });

    if (!item) {
      return NextResponse.json(
        { error: "Work item not found" },
        { status: 404 },
      );
    }
    if (
      !canPatchWorkItem(
        session.user.role,
        session.user.id,
        item,
        patch,
      )
    ) {
      return forbidden();
    }

    const updated = await prisma.staffWorkItem.update({
      where: { id },
      data: patch,
    });
    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: formatZodErrors(error) },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { error: "Failed to update work item" },
      { status: 500 },
    );
  }
}

export const GET = observeRoute(getHandler);
export const POST = observeRoute(postHandler);
export const PATCH = observeRoute(patchHandler);
