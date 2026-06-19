import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { inquiryStatusSchema } from "@/lib/validators";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const body = await request.json();
    const { status } = inquiryStatusSchema.parse(body);

    const inquiry = await prisma.inquiry.update({
      where: { id },
      data: { status },
      include: { vehicle: true },
    });

    return NextResponse.json(inquiry);
  } catch {
    return NextResponse.json({ error: "Failed to update inquiry" }, { status: 500 });
  }
}
