import { NextResponse } from "next/server";
import { canAssignWork } from "@/lib/admin-roles";
import { requireStaffSession } from "@/lib/auth";
import { observeRoute } from "@/lib/health/observe-route";
import { prisma } from "@/lib/prisma";

async function getHandler() {
  const session = await requireStaffSession();
  if (!session || !canAssignWork(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const staff = await prisma.adminUser.findMany({
    where: {
      active: true,
      role: {
        in: ["admin", "senior_developer", "junior_developer"],
      },
    },
    orderBy: { email: "asc" },
    select: { id: true, email: true, role: true },
  });

  return NextResponse.json(staff);
}

export const GET = observeRoute(getHandler);
