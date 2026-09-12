import { observeRoute } from "@/lib/health/observe-route";
import { NextRequest, NextResponse } from "next/server";
import { applyEvidenceAnswers, mergeGstDocumentExtracts } from "@/lib/credit-note-itc-extract";
import { readGstDocumentFile, validateGstDocumentFile } from "@/lib/credit-note-itc-read";

export const runtime = "nodejs";
export const maxDuration = 60;

function asFile(value: FormDataEntryValue | null): File | null {
  return value instanceof File && value.size > 0 ? value : null;
}

async function postHandler(request: NextRequest) {
  const form = await request.formData();
  const invoiceFile = asFile(form.get("invoice"));
  const creditNoteFile = asFile(form.get("creditNote"));
  const gstr3bFile = asFile(form.get("gstr3b"));
  const imsFile = asFile(form.get("ims"));

  if (!invoiceFile && !creditNoteFile && !gstr3bFile && !imsFile) {
    return NextResponse.json(
      { error: "Upload the invoice, credit note, GSTR-3B, or IMS screen." },
      { status: 400 },
    );
  }

  for (const file of [invoiceFile, creditNoteFile, gstr3bFile, imsFile]) {
    if (!file) continue;
    const invalid = validateGstDocumentFile(file);
    if (invalid) {
      return NextResponse.json({ error: invalid }, { status: 400 });
    }
  }

  try {
    const [invoiceRead, creditNoteRead, gstr3bRead, imsRead] = await Promise.all([
      invoiceFile ? readGstDocumentFile(invoiceFile, "invoice", "invoice") : null,
      creditNoteFile ? readGstDocumentFile(creditNoteFile, "credit_note", "credit_note") : null,
      gstr3bFile ? readGstDocumentFile(gstr3bFile, undefined, "gstr3b") : null,
      imsFile ? readGstDocumentFile(imsFile, undefined, "ims") : null,
    ]);

    let fields = mergeGstDocumentExtracts(invoiceRead?.extract, creditNoteRead?.extract);
    if (!invoiceFile && !creditNoteFile) {
      fields = { ...fields, warnings: [], filled: [] };
    }
    fields = applyEvidenceAnswers(fields, {
      ...creditNoteRead?.answers,
      ...gstr3bRead?.answers,
      ...imsRead?.answers,
      warnings: [
        invoiceRead?.warning,
        creditNoteRead?.warning,
        gstr3bRead?.warning,
        imsRead?.warning,
      ].filter((item): item is string => Boolean(item)),
    });

    if (!gstr3bRead?.answers.itcAvailedExtent && gstr3bFile) {
      fields.warnings.push("Could not see whether ITC was claimed. Check GSTR-3B Table 4 and pick the answer.");
    }
    if (!imsRead?.answers.imsStatus && imsFile) {
      fields.warnings.push("Could not see the IMS action. Open IMS → Credit Notes and pick Accept / Reject / Pending.");
    }

    return NextResponse.json({
      fields,
      warnings: fields.warnings,
      sources: {
        invoice: invoiceRead?.source ?? null,
        creditNote: creditNoteRead?.source ?? null,
        gstr3b: gstr3bRead?.source ?? null,
        ims: imsRead?.source ?? null,
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
