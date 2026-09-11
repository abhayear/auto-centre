import { observeRoute } from "@/lib/health/observe-route";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminRole, requireOpsPortal } from "@/lib/auth";
import {
  decideCreditNoteItc,
  parseIsoDate,
  serializeCreditNoteItcCase,
  type CreditNoteKind,
  type ImsStatus,
} from "@/lib/credit-note-itc";
import { prisma } from "@/lib/prisma";
import { creditNoteItcCaseUpdateSchema, formatZodErrors } from "@/lib/validators";

type RouteParams = { params: Promise<{ id: string }> };

async function getHandler(_request: NextRequest, { params }: RouteParams) {
  const session = await requireOpsPortal();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const record = await prisma.creditNoteItcCase.findUnique({ where: { id } });
  if (!record) {
    return NextResponse.json({ error: "Record not found" }, { status: 404 });
  }
  return NextResponse.json(serializeCreditNoteItcCase(record));
}

async function patchHandler(request: NextRequest, { params }: RouteParams) {
  const session = await requireOpsPortal();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;

  try {
    const existing = await prisma.creditNoteItcCase.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Record not found" }, { status: 404 });
    }

    const data = creditNoteItcCaseUpdateSchema.parse(await request.json());
    const merged = {
      itcAlreadyClaimed: data.itcAlreadyClaimed ?? existing.itcAlreadyClaimed,
      creditNoteKind: (data.creditNoteKind ?? existing.creditNoteKind) as CreditNoteKind,
      imsStatus: (data.imsStatus ?? existing.imsStatus) as ImsStatus,
    };
    const decision = decideCreditNoteItc(merged);

    const record = await prisma.creditNoteItcCase.update({
      where: { id },
      data: {
        ...(data.purchaserName !== undefined ? { purchaserName: data.purchaserName } : {}),
        ...(data.purchaserGstin !== undefined ? { purchaserGstin: data.purchaserGstin } : {}),
        ...(data.purchaserAddress !== undefined ? { purchaserAddress: data.purchaserAddress } : {}),
        ...(data.supplierName !== undefined ? { supplierName: data.supplierName } : {}),
        ...(data.supplierGstin !== undefined ? { supplierGstin: data.supplierGstin } : {}),
        ...(data.originalInvoiceNumber !== undefined
          ? { originalInvoiceNumber: data.originalInvoiceNumber }
          : {}),
        ...(data.originalInvoiceDate
          ? { originalInvoiceDate: parseIsoDate(data.originalInvoiceDate) }
          : {}),
        ...(data.creditNoteNumber !== undefined ? { creditNoteNumber: data.creditNoteNumber } : {}),
        ...(data.creditNoteDate ? { creditNoteDate: parseIsoDate(data.creditNoteDate) } : {}),
        ...(data.itcAlreadyClaimed !== undefined ? { itcAlreadyClaimed: data.itcAlreadyClaimed } : {}),
        ...(data.creditNoteKind !== undefined ? { creditNoteKind: data.creditNoteKind } : {}),
        ...(data.reason !== undefined ? { reason: data.reason } : {}),
        ...(data.imsStatus !== undefined ? { imsStatus: data.imsStatus } : {}),
        ...(data.taxableValue !== undefined ? { taxableValue: data.taxableValue } : {}),
        ...(data.cgst !== undefined ? { cgst: data.cgst } : {}),
        ...(data.sgst !== undefined ? { sgst: data.sgst } : {}),
        ...(data.igst !== undefined ? { igst: data.igst } : {}),
        ...(data.cess !== undefined ? { cess: data.cess } : {}),
        ...(data.reversalPeriod !== undefined
          ? { reversalPeriod: data.reversalPeriod?.trim() || null }
          : {}),
        ...(data.status !== undefined ? { status: data.status } : {}),
        action: decision.action,
        summary: decision.summary,
        declarationKind: decision.declarationKind,
      },
    });
    return NextResponse.json(serializeCreditNoteItcCase(record));
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: formatZodErrors(error) },
        { status: 400 },
      );
    }
    return NextResponse.json({ error: "Failed to update credit note case" }, { status: 500 });
  }
}

async function deleteHandler(_request: NextRequest, { params }: RouteParams) {
  const session = await requireAdminRole();
  if (!session) {
    return NextResponse.json({ error: "Only admins can delete credit note cases" }, { status: 403 });
  }
  const { id } = await params;
  try {
    await prisma.creditNoteItcCase.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete record" }, { status: 500 });
  }
}

export const GET = observeRoute(getHandler);
export const PATCH = observeRoute(patchHandler);
export const DELETE = observeRoute(deleteHandler);
