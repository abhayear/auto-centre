import type { ImsStatus, ItcAvailedExtent, CreditNoteReason } from "@/lib/credit-note-itc";
import {
  emptyGstDocumentExtract,
  parseCreditNoteReasonFromText,
  parseGstDocumentText,
  parseImsStatusFromText,
  parseItcExtentFromGstr3b,
  type GstDocumentExtract,
  type GstDocumentKind,
} from "@/lib/credit-note-itc-extract";

export type EvidencePurpose = "invoice" | "credit_note" | "gstr3b" | "ims";

export const MAX_GST_DOCUMENT_BYTES = 6 * 1024 * 1024;
export const GST_DOCUMENT_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

export type EvidenceAnswers = {
  itcAvailedExtent?: ItcAvailedExtent | null;
  imsStatus?: ImsStatus | null;
  reason?: CreditNoteReason | null;
  reversalPeriod?: string | null;
};

export type ReadGstDocumentResult = {
  extract: GstDocumentExtract;
  text: string;
  answers: EvidenceAnswers;
  source: "pdf-text" | "vision" | "empty";
  warning?: string;
};

export function validateGstDocumentFile(file: File): string | null {
  const type = file.type || guessGstDocumentType(file.name);
  if (!GST_DOCUMENT_TYPES.has(type)) {
    return "Use a PDF, JPG, or PNG of the invoice, credit note, GSTR-3B, or IMS screen.";
  }
  if (file.size > MAX_GST_DOCUMENT_BYTES) {
    return "Each file must be 6 MB or smaller.";
  }
  return null;
}

export function guessGstDocumentType(filename: string): string {
  const lower = filename.toLowerCase();
  if (lower.endsWith(".pdf")) return "application/pdf";
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  return "";
}

async function extractPdfText(bytes: Uint8Array): Promise<string> {
  const { extractText, getDocumentProxy } = await import("unpdf");
  const pdf = await getDocumentProxy(bytes);
  const result = await extractText(pdf, { mergePages: true });
  const text = result.text as string | string[];
  return Array.isArray(text) ? text.join("\n") : text;
}

export function answersFromText(text: string, purpose?: EvidencePurpose): EvidenceAnswers {
  const itc = parseItcExtentFromGstr3b(text);
  const answers: EvidenceAnswers = {
    reason: parseCreditNoteReasonFromText(text),
    imsStatus: parseImsStatusFromText(text),
    itcAvailedExtent: itc.extent,
    reversalPeriod: itc.reversalPeriod || null,
  };
  if (purpose === "gstr3b") {
    return { itcAvailedExtent: itc.extent, reversalPeriod: itc.reversalPeriod || null };
  }
  if (purpose === "ims") {
    return { imsStatus: parseImsStatusFromText(text) };
  }
  if (purpose === "credit_note") {
    return { reason: parseCreditNoteReasonFromText(text) };
  }
  return answers;
}

function parseVisionJson(raw: string): Partial<GstDocumentExtract> {
  const json = raw.replace(/^```json\s*|\s*```$/g, "").trim();
  const data = JSON.parse(json) as Record<string, unknown>;
  return {
    documentKind:
      data.documentKind === "invoice" || data.documentKind === "credit_note"
        ? data.documentKind
        : "unknown",
    invoiceNumber: String(data.invoiceNumber ?? ""),
    invoiceDate: String(data.invoiceDate ?? ""),
    creditNoteNumber: String(data.creditNoteNumber ?? ""),
    creditNoteDate: String(data.creditNoteDate ?? ""),
    originalInvoiceNumber: String(data.originalInvoiceNumber ?? ""),
    originalInvoiceDate: String(data.originalInvoiceDate ?? ""),
    purchaserName: String(data.purchaserName ?? ""),
    purchaserGstin: String(data.purchaserGstin ?? "").toUpperCase(),
    purchaserAddress: String(data.purchaserAddress ?? ""),
    supplierName: String(data.supplierName ?? ""),
    supplierGstin: String(data.supplierGstin ?? "").toUpperCase(),
    taxableValue: Number(data.taxableValue) || 0,
    cgst: Number(data.cgst) || 0,
    sgst: Number(data.sgst) || 0,
    igst: Number(data.igst) || 0,
    cess: Number(data.cess) || 0,
  };
}

function visionPrompt(purpose?: EvidencePurpose, hint?: GstDocumentKind): string {
  if (purpose === "ims") {
    return "This is an Indian GST IMS (Invoice Management System) screen for a credit note. Return JSON only: {\"imsStatus\":\"accept|reject|pending|no_action|not_on_ims\"}. Use no_action for deemed accept / no action. Use not_on_ims if the CN is not listed.";
  }
  if (purpose === "gstr3b") {
    return "This is an Indian GSTR-3B (or ITC ledger) for the period when a purchase invoice was claimed. Return JSON only: {\"itcAvailedExtent\":\"full|part|none\",\"reversalPeriod\":\"YYYY-MM\"}. full = ITC was availed on that inward supply, none = not availed, part = only part. reversalPeriod is the GSTR-3B tax period if visible.";
  }
  return `Extract fields from an Indian GST tax invoice or credit note. Return JSON only with keys: documentKind (invoice|credit_note|unknown), invoiceNumber, invoiceDate (YYYY-MM-DD), creditNoteNumber, creditNoteDate, originalInvoiceNumber, originalInvoiceDate, purchaserName, purchaserGstin, purchaserAddress, supplierName, supplierGstin, taxableValue, cgst, sgst, igst, cess, reason (return|post_sale_discount|value_or_tax_reduced), imsStatus if visible. Use empty string or 0 when missing. Purchaser is Bill To / Buyer. Supplier is the seller.${
    hint ? ` This file is the ${hint === "credit_note" ? "credit note" : "original invoice"}.` : ""
  }`;
}

function answersFromVisionJson(raw: string): EvidenceAnswers {
  try {
    const data = JSON.parse(raw.replace(/^```json\s*|\s*```$/g, "").trim()) as Record<string, unknown>;
    const extent = data.itcAvailedExtent;
    const ims = data.imsStatus;
    const reason = data.reason;
    return {
      itcAvailedExtent:
        extent === "full" || extent === "part" || extent === "none" ? extent : null,
      imsStatus:
        ims === "accept" ||
        ims === "reject" ||
        ims === "pending" ||
        ims === "no_action" ||
        ims === "not_on_ims"
          ? ims
          : null,
      reason:
        reason === "return" || reason === "post_sale_discount" || reason === "value_or_tax_reduced"
          ? reason
          : null,
      reversalPeriod: typeof data.reversalPeriod === "string" ? data.reversalPeriod : null,
    };
  } catch {
    return {};
  }
}

async function extractWithVision(
  bytes: Uint8Array,
  mime: string,
  hint?: GstDocumentKind,
  purpose?: EvidencePurpose,
): Promise<{ extract: GstDocumentExtract; answers: EvidenceAnswers } | null> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) return null;

  const model = process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini";
  const base64 = Buffer.from(bytes).toString("base64");
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0,
      max_tokens: 700,
      messages: [
        { role: "system", content: visionPrompt(purpose, hint) },
        {
          role: "user",
          content: [
            { type: "text", text: "Read this GST paper or portal screenshot." },
            { type: "image_url", image_url: { url: `data:${mime};base64,${base64}` } },
          ],
        },
      ],
    }),
  });

  if (!response.ok) return null;
  const data = (await response.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const content = data.choices?.[0]?.message?.content?.trim();
  if (!content) return null;
  try {
    return {
      extract: emptyGstDocumentExtract(parseVisionJson(content)),
      answers: answersFromVisionJson(content),
    };
  } catch {
    return {
      extract: emptyGstDocumentExtract(),
      answers: answersFromVisionJson(content),
    };
  }
}

export async function readGstDocumentFile(
  file: File,
  hint?: GstDocumentKind,
  purpose?: EvidencePurpose,
): Promise<ReadGstDocumentResult> {
  const type = file.type || guessGstDocumentType(file.name);
  const bytes = new Uint8Array(await file.arrayBuffer());
  const empty = (): ReadGstDocumentResult => ({
    extract: emptyGstDocumentExtract({ documentKind: hint ?? "unknown" }),
    text: "",
    answers: {},
    source: "empty",
  });

  if (type === "application/pdf") {
    try {
      const text = await extractPdfText(bytes);
      if (text.replace(/\s+/g, " ").trim().length >= 20) {
        return {
          extract: parseGstDocumentText(text, hint),
          text,
          answers: answersFromText(text, purpose),
          source: "pdf-text",
        };
      }
    } catch {
      // fall through
    }
    return {
      ...empty(),
      warning:
        "This PDF looks like a scan with no readable text. Upload a Tally/print PDF, or a clear JPG/PNG photo.",
    };
  }

  try {
    const vision = await extractWithVision(bytes, type, hint, purpose);
    if (vision) {
      return {
        extract: vision.extract,
        text: "",
        answers: vision.answers,
        source: "vision",
      };
    }
  } catch {
    // fall through
  }

  return {
    ...empty(),
    warning: "Could not read this photo. Try a clearer picture, or upload the PDF from Tally.",
  };
}
