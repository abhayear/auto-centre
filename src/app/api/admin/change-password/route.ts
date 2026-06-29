import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { changePasswordSchema, formatZodErrors } from "@/lib/validators";

export async function PATCH(request: NextRequest) {
  const session = await requireAdmin();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const data = changePasswordSchema.parse(body);

    const user = await prisma.adminUser.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: "Admin account not found" }, { status: 404 });
    }

    const currentValid = await bcrypt.compare(data.currentPassword, user.passwordHash);
    if (!currentValid) {
      return NextResponse.json(
        { error: "Current password is incorrect", details: [{ field: "currentPassword", message: "Current password is incorrect" }] },
        { status: 400 }
      );
    }

    const passwordHash = await bcrypt.hash(data.newPassword, 12);
    await prisma.adminUser.update({
      where: { id: user.id },
      data: { passwordHash },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: formatZodErrors(error) },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: "Failed to change password" }, { status: 500 });
  }
}
