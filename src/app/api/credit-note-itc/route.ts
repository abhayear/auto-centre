import { observeRoute } from "@/lib/health/observe-route";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireOpsPortal } from "@/lib/auth";
import {
  decideCreditNoteItc,
  parseIsoDate,
  serializeCreditNoteItcCase,
} from "@/lib/credit-note-itc";
import { prisma } from "@/lib/prisma";
import { creditNoteItcCaseSchema, formatZodErrors } from "@/lib/validators";

async function getHandler() {
  const session = await requireOpsPortal();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const records = await prisma.creditNoteItcCase.findMany({
    orderBy: [{ creditNoteDate: "desc" }, { createdAt: "desc" }],
    take: 200,
  });
  return NextResponse.json(records.map(serializeCreditNoteItcCase));
}

async function postHandler(request: NextRequest) {
  const session = await requireOpsPortal();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const data = creditNoteItcCaseSchema.parse(await request.json());
    const decision = decideCreditNoteItc(data);
    const record = await prisma.creditNoteItcCase.create({
      data: {
        purchaserName: data.purchaserName,
        purchaserGstin: data.purchaserGstin,
        purchaserAddress: data.purchaserAddress,
        supplierName: data.supplierName,
        supplierGstin: data.supplierGstin,
        originalInvoiceNumber: data.originalInvoiceNumber,
        originalInvoiceDate: parseIsoDate(data.originalInvoiceDate),
        creditNoteNumber: data.creditNoteNumber,
        creditNoteDate: parseIsoDate(data.creditNoteDate),
        itcAlreadyClaimed: data.itcAlreadyClaimed,
        creditNoteKind: data.creditNoteKind,
        reason: data.reason,
        imsStatus: data.imsStatus,
        taxableValue: data.taxableValue,
        cgst: data.cgst,
        sgst: data.sgst,
        igst: data.igst,
        cess: data.cess,
        reversalPeriod: data.reversalPeriod?.trim() || null,
        action: decision.action,
        summary: decision.summary,
        declarationKind: decision.declarationKind,
        status: data.status ?? "draft",
        createdByEmail: session.user.email ?? "unknown",
      },
    });
    return NextResponse.json(serializeCreditNoteItcCase(record), { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: formatZodErrors(error) },
        { status: 400 },
      );
    }
    return NextResponse.json({ error: "Failed to save credit note case" }, { status: 500 });
  }
}

export const GET = observeRoute(getHandler);
export const POST = observeRoute(postHandler);
