import { observeRoute } from "@/lib/health/observe-route";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  canEditTraining,
  isAdminRole,
  trainingAudienceForRole,
} from "@/lib/admin-roles";
import { requireStaffSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { visibleTrainingRows } from "@/lib/training-access";
import { formatZodErrors, trainingResourceSchema } from "@/lib/validators";

async function getHandler() {
  const session = await requireStaffSession();
  if (!session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const role = session.user.role;
  if (!isAdminRole(role) && trainingAudienceForRole(role) === null) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const rows = await prisma.trainingResource.findMany({
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
  });

  return NextResponse.json(visibleTrainingRows(role, rows));
}

async function postHandler(request: NextRequest) {
  const session = await requireStaffSession();
  if (!session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!canEditTraining(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const data = trainingResourceSchema.parse(body);

    const resource = await prisma.trainingResource.create({
      data: {
        ...data,
        updatedByEmail: session.user.email!,
      },
    });

    return NextResponse.json(resource, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: formatZodErrors(error) },
        { status: 400 },
      );
    }
    return NextResponse.json({ error: "Failed to create training resource" }, { status: 500 });
  }
}

async function patchHandler(request: NextRequest) {
  const session = await requireStaffSession();
  if (!session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!canEditTraining(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { id, ...rest } = body;

    if (!id) {
      return NextResponse.json({ error: "Training resource id is required" }, { status: 400 });
    }

    const data = trainingResourceSchema.partial().parse(rest);

    const resource = await prisma.trainingResource.update({
      where: { id },
      data: {
        ...data,
        updatedByEmail: session.user.email!,
      },
    });

    return NextResponse.json(resource);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: formatZodErrors(error) },
        { status: 400 },
      );
    }
    return NextResponse.json({ error: "Failed to update training resource" }, { status: 500 });
  }
}

async function deleteHandler(request: NextRequest) {
  const session = await requireStaffSession();
  if (!session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!canEditTraining(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const id = request.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Training resource id is required" }, { status: 400 });
  }

  try {
    await prisma.trainingResource.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete training resource" }, { status: 500 });
  }
}

export const GET = observeRoute(getHandler);
export const POST = observeRoute(postHandler);
export const PATCH = observeRoute(patchHandler);
export const DELETE = observeRoute(deleteHandler);
