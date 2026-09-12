import { observeRoute } from "@/lib/health/observe-route";
import { NextRequest, NextResponse } from "next/server";
import { mergeGstDocumentExtracts } from "@/lib/credit-note-itc-extract";
import { readGstDocumentFile, validateGstDocumentFile } from "@/lib/credit-note-itc-read";

export const runtime = "nodejs";
export const maxDuration = 60;

async function postHandler(request: NextRequest) {
  const form = await request.formData();
  const invoiceFile = form.get("invoice");
  const creditNoteFile = form.get("creditNote");

  if (!(invoiceFile instanceof File) && !(creditNoteFile instanceof File)) {
    return NextResponse.json(
      { error: "Upload the original invoice and/or the credit note." },
      { status: 400 },
    );
  }

  for (const file of [invoiceFile, creditNoteFile]) {
    if (!(file instanceof File)) continue;
    const invalid = validateGstDocumentFile(file);
    if (invalid) {
      return NextResponse.json({ error: invalid }, { status: 400 });
    }
  }

  try {
    const [invoiceRead, creditNoteRead] = await Promise.all([
      invoiceFile instanceof File ? readGstDocumentFile(invoiceFile, "invoice") : Promise.resolve(null),
      creditNoteFile instanceof File
        ? readGstDocumentFile(creditNoteFile, "credit_note")
        : Promise.resolve(null),
    ]);

    const fields = mergeGstDocumentExtracts(invoiceRead?.extract, creditNoteRead?.extract);
    const warnings = [
      invoiceRead?.warning,
      creditNoteRead?.warning,
      ...fields.warnings,
    ].filter((item): item is string => Boolean(item));

    return NextResponse.json({
      fields,
      warnings,
      sources: {
        invoice: invoiceRead?.source ?? null,
        creditNote: creditNoteRead?.source ?? null,
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Could not read those files. Try PDFs from Tally, or clearer photos." },
      { status: 500 },
    );
  }
}

export const POST = observeRoute(postHandler);
