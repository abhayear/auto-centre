import {
  emptyGstDocumentExtract,
  parseGstDocumentText,
  type GstDocumentExtract,
  type GstDocumentKind,
} from "@/lib/credit-note-itc-extract";

export const MAX_GST_DOCUMENT_BYTES = 6 * 1024 * 1024;
export const GST_DOCUMENT_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

export type ReadGstDocumentResult = {
  extract: GstDocumentExtract;
  source: "pdf-text" | "vision" | "empty";
  warning?: string;
};

export function validateGstDocumentFile(file: File): string | null {
  const type = file.type || guessGstDocumentType(file.name);
  if (!GST_DOCUMENT_TYPES.has(type)) {
    return "Use a PDF, JPG, or PNG of the invoice or credit note.";
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

async function extractWithVision(
  bytes: Uint8Array,
  mime: string,
  hint?: GstDocumentKind,
): Promise<GstDocumentExtract | null> {
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
        {
          role: "system",
          content:
            "Extract fields from an Indian GST tax invoice or credit note. Return JSON only with keys: documentKind (invoice|credit_note|unknown), invoiceNumber, invoiceDate (YYYY-MM-DD), creditNoteNumber, creditNoteDate, originalInvoiceNumber, originalInvoiceDate, purchaserName, purchaserGstin, purchaserAddress, supplierName, supplierGstin, taxableValue, cgst, sgst, igst, cess. Use empty string or 0 when missing. Purchaser is Bill To / Buyer. Supplier is the seller who issued the document.",
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: hint
                ? `This file is the ${hint === "credit_note" ? "credit note" : "original invoice"}.`
                : "Read this GST document.",
            },
            {
              type: "image_url",
              image_url: { url: `data:${mime};base64,${base64}` },
            },
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
    return emptyGstDocumentExtract(parseVisionJson(content));
  } catch {
    return null;
  }
}

export async function readGstDocumentFile(
  file: File,
  hint?: GstDocumentKind,
): Promise<ReadGstDocumentResult> {
  const type = file.type || guessGstDocumentType(file.name);
  const bytes = new Uint8Array(await file.arrayBuffer());

  if (type === "application/pdf") {
    try {
      const text = await extractPdfText(bytes);
      if (text.replace(/\s+/g, " ").trim().length >= 20) {
        return { extract: parseGstDocumentText(text, hint), source: "pdf-text" };
      }
    } catch {
      // fall through
    }
    return {
      extract: emptyGstDocumentExtract({ documentKind: hint ?? "unknown" }),
      source: "empty",
      warning:
        "This PDF looks like a scan with no readable text. Upload a Tally/print PDF, or a clear JPG/PNG photo.",
    };
  }

  try {
    const vision = await extractWithVision(bytes, type, hint);
    if (vision) return { extract: vision, source: "vision" };
  } catch {
    // fall through
  }

  return {
    extract: emptyGstDocumentExtract({ documentKind: hint ?? "unknown" }),
    source: "empty",
    warning:
      "Could not read this photo. Try a clearer picture, or upload the PDF from Tally.",
  };
}
