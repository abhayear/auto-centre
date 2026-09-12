import { GSTIN_PATTERN, type CreditNoteKind } from "@/lib/credit-note-itc";

export type GstDocumentKind = "invoice" | "credit_note" | "unknown";

export type GstDocumentExtract = {
  documentKind: GstDocumentKind;
  invoiceNumber: string;
  invoiceDate: string;
  creditNoteNumber: string;
  creditNoteDate: string;
  originalInvoiceNumber: string;
  originalInvoiceDate: string;
  purchaserName: string;
  purchaserGstin: string;
  purchaserAddress: string;
  supplierName: string;
  supplierGstin: string;
  taxableValue: number;
  cgst: number;
  sgst: number;
  igst: number;
  cess: number;
};

export type CreditNoteItcAutofill = {
  originalInvoiceNumber: string;
  originalInvoiceDate: string;
  creditNoteNumber: string;
  creditNoteDate: string;
  purchaserName: string;
  purchaserGstin: string;
  purchaserAddress: string;
  supplierName: string;
  supplierGstin: string;
  taxableValue: number;
  cgst: number;
  sgst: number;
  igst: number;
  cess: number;
  creditNoteKind: CreditNoteKind;
  filled: string[];
  warnings: string[];
};

const GSTIN_SEARCH = /[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]/gi;
const MONTHS: Record<string, string> = {
  jan: "01",
  feb: "02",
  mar: "03",
  apr: "04",
  may: "05",
  jun: "06",
  jul: "07",
  aug: "08",
  sep: "09",
  oct: "10",
  nov: "11",
  dec: "12",
};

const EMPTY_EXTRACT: GstDocumentExtract = {
  documentKind: "unknown",
  invoiceNumber: "",
  invoiceDate: "",
  creditNoteNumber: "",
  creditNoteDate: "",
  originalInvoiceNumber: "",
  originalInvoiceDate: "",
  purchaserName: "",
  purchaserGstin: "",
  purchaserAddress: "",
  supplierName: "",
  supplierGstin: "",
  taxableValue: 0,
  cgst: 0,
  sgst: 0,
  igst: 0,
  cess: 0,
};

export function emptyGstDocumentExtract(
  overrides: Partial<GstDocumentExtract> = {},
): GstDocumentExtract {
  return { ...EMPTY_EXTRACT, ...overrides };
}

export function toIsoDate(value: string | null | undefined): string {
  if (!value) return "";
  const raw = value.trim();
  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) return raw;

  const numeric = raw.match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{4})$/);
  if (numeric) {
    const day = numeric[1].padStart(2, "0");
    const month = numeric[2].padStart(2, "0");
    return `${numeric[3]}-${month}-${day}`;
  }

  const named = raw.match(/^(\d{1,2})[\/.\- ]([A-Za-z]{3,9})[\/.\- ](\d{4})$/);
  if (named) {
    const month = MONTHS[named[2].slice(0, 3).toLowerCase()];
    if (!month) return "";
    return `${named[3]}-${month}-${named[1].padStart(2, "0")}`;
  }

  return "";
}

export function parseIndianAmount(value: string | null | undefined): number {
  if (!value) return 0;
  const cleaned = value.replace(/,/g, "").replace(/[^\d.]/g, "");
  if (!cleaned) return 0;
  const amount = Number(cleaned);
  return Number.isFinite(amount) ? amount : 0;
}

export function normalizeExtractedText(text: string): string {
  return text
    .replace(/([A-Za-z])\n([a-z])/g, "$1$2")
    .replace(/(\d)\n(\d)/g, "$1$2")
    .replace(/([A-Z]{2,})\n([A-Z]{1,3})(?=\s|:)/g, "$1$2")
    .replace(/[ \t]+\n/g, "\n");
}

export function detectGstDocumentKind(text: string): GstDocumentKind {
  const normalized = text.replace(/\s+/g, " ");
  if (/\bcredit\s*note\b|\bcr\.?\s*note\b|\bcn\s*(?:no|number|#)\b/i.test(normalized)) {
    return "credit_note";
  }
  if (/\btax\s*invoice\b|\binvoice\s*(?:no|number|#)\b/i.test(normalized)) {
    return "invoice";
  }
  return "unknown";
}

function firstMatch(text: string, patterns: RegExp[]): string {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    const value = match?.[1]?.trim();
    if (value) return value;
  }
  return "";
}

function amountAfter(text: string, labels: string[]): number {
  for (const label of labels) {
    const pattern = new RegExp(
      `${label}\\s*(?:@\\s*[\\d.]+\\s*%\\s*)?[:\\-]?\\s*(?:rs\\.?|inr|₹)?\\s*([\\d,]+(?:\\.\\d{1,2})?)`,
      "i",
    );
    const match = text.match(pattern);
    if (match?.[1]) return parseIndianAmount(match[1]);
  }
  return 0;
}

function nearbyName(text: string, gstinIndex: number): string {
  const before = text.slice(Math.max(0, gstinIndex - 180), gstinIndex);
  const chunks = before
    .split(/\n+| {2,}|(?<=[a-z])(?=[A-Z][a-z])/)
    .flatMap((line) => line.split(/\s{2,}/))
    .map((line) => line.trim())
    .filter(Boolean);
  const skip =
    /^(gstin|gst|tax invoice|credit note|bill to|billed to|buyer|recipient|seller|supplier|address|invoice|date|irn|components)\b/i;
  for (let i = chunks.length - 1; i >= 0; i -= 1) {
    const line = chunks[i].replace(/[:\-]+$/, "").trim();
    if (!line || skip.test(line) || GSTIN_SEARCH.test(line)) continue;
    if (line.length < 3 || line.length > 80) continue;
    if (!/[A-Za-z]/.test(line)) continue;
    if (/^(invoice|credit|taxable|cgst|sgst|igst|date|no)$/i.test(line)) continue;
    return line.replace(/\bGSTIN\b.*$/i, "").trim();
  }
  return "";
}

function nearbyAddress(text: string, gstinIndex: number): string {
  const after = text.slice(gstinIndex, gstinIndex + 220);
  const lines = after
    .split(/\n+/)
    .slice(1, 4)
    .map((line) => line.trim())
    .filter(
      (line) =>
        line &&
        !GSTIN_SEARCH.test(line) &&
        !/^(invoice|credit|taxable|cgst|sgst|igst|value|date|against)/i.test(line) &&
        !/\b(taxable|cgst|sgst|igst|invoice no|credit note)\b/i.test(line),
    );
  return lines.slice(0, 2).join(", ");
}

function collectGstins(text: string): Array<{ gstin: string; index: number }> {
  const found: Array<{ gstin: string; index: number }> = [];
  const seen = new Set<string>();
  for (const match of text.matchAll(GSTIN_SEARCH)) {
    const gstin = match[0].toUpperCase();
    if (!GSTIN_PATTERN.test(gstin) || seen.has(gstin)) continue;
    seen.add(gstin);
    found.push({ gstin, index: match.index ?? 0 });
  }
  return found;
}

function assignParties(text: string): Pick<
  GstDocumentExtract,
  "purchaserName" | "purchaserGstin" | "purchaserAddress" | "supplierName" | "supplierGstin"
> {
  const gstins = collectGstins(text);
  let supplierGstin = "";
  let purchaserGstin = "";
  let supplierName = "";
  let purchaserName = "";
  let purchaserAddress = "";

  for (const item of gstins) {
    const before = text.slice(Math.max(0, item.index - 160), item.index);
    const isBuyer = /\b(bill\s*to|billed\s*to|buyer|recipient|customer|consignee)\b/i.test(before);
    const isSeller = /\b(seller|supplier|from)\b/i.test(before);
    const name = nearbyName(text, item.index);
    if (isBuyer && !purchaserGstin) {
      purchaserGstin = item.gstin;
      purchaserName = name;
      purchaserAddress = nearbyAddress(text, item.index);
    } else if ((isSeller || !supplierGstin) && !isBuyer) {
      supplierGstin = item.gstin;
      supplierName = name;
    } else if (!purchaserGstin) {
      purchaserGstin = item.gstin;
      purchaserName = name;
      purchaserAddress = nearbyAddress(text, item.index);
    }
  }

  return {
    supplierGstin,
    supplierName,
    purchaserGstin,
    purchaserName,
    purchaserAddress,
  };
}

export function parseGstDocumentText(
  text: string,
  hint?: GstDocumentKind,
): GstDocumentExtract {
  text = normalizeExtractedText(text);
  const documentKind = hint && hint !== "unknown" ? hint : detectGstDocumentKind(text);
  const parties = assignParties(text);
  const labeledBuyer = firstMatch(text, [/bill(?:ed)?\s*to(?:\s*\/\s*recipient)?\s+([A-Za-z][A-Za-z .,&'-]{2,60}?)\s+GSTIN/i]);
  const labeledSeller = firstMatch(text, [/(?:tax\s+invoice|credit\s+note)\s+([A-Za-z][A-Za-z .,&'-]{2,60}?)\s+GSTIN/i]);
  if (labeledBuyer) parties.purchaserName = parties.purchaserName || labeledBuyer;
  if (labeledSeller) parties.supplierName = parties.supplierName || labeledSeller;

  const invoiceNumber = firstMatch(text, [
    /(?:against|original)\s+(?:tax\s+)?invoice\s*(?:no\.?|number|#)?\s*[:.\-]?\s*([A-Z0-9][A-Z0-9/.-]{2,}?)(?=\s|$|dated|date|taxable)/i,
    /(?:tax\s+)?invoice\s*(?:no\.?|number|#)\s*[:.\-]?\s*([A-Z0-9][A-Z0-9/.-]{2,}?)(?=\s|$|invoice|date|taxable)/i,
  ]);
  const invoiceDate = toIsoDate(
    firstMatch(text, [
      /(?:against|original)\s+(?:tax\s+)?invoice[^\n]{0,40}?dated\s*[:.\-]?\s*(\d{1,2}[\/.\- ][A-Za-z0-9]{2,9}[\/.\- ]\d{4})/i,
      /(?:tax\s+)?invoice\s*date\s*[:.\-]?\s*(\d{1,2}[\/.\- ][A-Za-z0-9]{2,9}[\/.\- ]\d{4})/i,
      /(?:^|\n)\s*date\s*[:.\-]?\s*(\d{1,2}[\/.\- ][A-Za-z0-9]{2,9}[\/.\- ]\d{4})/i,
    ]),
  );
  const creditNoteNumber = firstMatch(text, [
    /credit\s*note\s*(?:no\.?|number|#)\s*[:.\-]?\s*([A-Z0-9][A-Z0-9/.-]{2,}?)(?=\s|$|date|against|invoice|taxable)/i,
    /\bcn\s*(?:no\.?|number|#)\s*[:.\-]?\s*([A-Z0-9][A-Z0-9/.-]{2,}?)(?=\s|$|date|against|invoice)/i,
  ]);
  const creditNoteDate = toIsoDate(
    firstMatch(text, [
      /credit\s*note\s*date\s*[:.\-]?\s*(\d{1,2}[\/.\- ][A-Za-z0-9]{2,9}[\/.\- ]\d{4})/i,
      documentKind === "credit_note"
        ? /(?:credit\s*note(?:\s*(?:no\.?|number|#)\s*[:.\-]?\s*[A-Z0-9/.-]+)?[^\n]{0,80}?)?\bdate\s*[:.\-]?\s*(\d{1,2}[\/.\- ][A-Za-z0-9]{2,9}[\/.\- ]\d{4})/i
        : /$^/,
    ]),
  );
  const originalInvoiceNumber = firstMatch(text, [
    /(?:against|original)\s+(?:tax\s+)?invoice\s*(?:no\.?|number|#)?\s*[:.\-]?\s*([A-Z0-9][A-Z0-9/.-]{2,}?)(?=\s|$|dated|date|taxable)/i,
  ]);
  const originalInvoiceDate = toIsoDate(
    firstMatch(text, [
      /(?:against|original)\s+(?:tax\s+)?invoice[^\n]{0,60}?dated\s*[:.\-]?\s*(\d{1,2}[\/.\- ][A-Za-z0-9]{2,9}[\/.\- ]\d{4})/i,
      /(?:against|original)\s+(?:tax\s+)?invoice[^\n]{0,40}?date\s*[:.\-]?\s*(\d{1,2}[\/.\- ][A-Za-z0-9]{2,9}[\/.\- ]\d{4})/i,
    ]),
  );

  return {
    documentKind,
    invoiceNumber: documentKind === "credit_note" ? originalInvoiceNumber || invoiceNumber : invoiceNumber,
    invoiceDate: documentKind === "credit_note" ? originalInvoiceDate || invoiceDate : invoiceDate,
    creditNoteNumber,
    creditNoteDate,
    originalInvoiceNumber: originalInvoiceNumber || (documentKind === "credit_note" ? invoiceNumber : ""),
    originalInvoiceDate: originalInvoiceDate || (documentKind === "credit_note" ? invoiceDate : ""),
    ...parties,
    taxableValue: amountAfter(text, ["taxable\\s+(?:value|amount)", "taxable"]),
    cgst: amountAfter(text, ["\\bcgst\\b"]),
    sgst: amountAfter(text, ["\\bsgst\\b"]),
    igst: amountAfter(text, ["\\bigst\\b"]),
    cess: amountAfter(text, ["\\bcess\\b"]),
  };
}

function pickText(...values: Array<string | undefined>): string {
  return values.find((value) => value?.trim())?.trim() ?? "";
}

function taxTotal(extract: Pick<GstDocumentExtract, "cgst" | "sgst" | "igst" | "cess">): number {
  return extract.cgst + extract.sgst + extract.igst + extract.cess;
}

export function mergeGstDocumentExtracts(
  first: GstDocumentExtract | null | undefined,
  second: GstDocumentExtract | null | undefined,
): CreditNoteItcAutofill {
  const docs = [first, second].filter((doc): doc is GstDocumentExtract => Boolean(doc));
  const invoice =
    docs.find((doc) => doc.documentKind === "invoice") ??
    docs.find((doc) => doc.invoiceNumber && !doc.creditNoteNumber) ??
    null;
  const creditNote =
    docs.find((doc) => doc.documentKind === "credit_note") ??
    docs.find((doc) => doc.creditNoteNumber) ??
    docs.find((doc) => doc !== invoice) ??
    null;

  const amountSource = creditNote ?? invoice ?? emptyGstDocumentExtract();
  const tax = taxTotal(amountSource);
  const fields = {
    originalInvoiceNumber: pickText(
      invoice?.invoiceNumber,
      invoice?.originalInvoiceNumber,
      creditNote?.originalInvoiceNumber,
      creditNote?.invoiceNumber,
    ),
    originalInvoiceDate: pickText(
      invoice?.invoiceDate,
      invoice?.originalInvoiceDate,
      creditNote?.originalInvoiceDate,
      creditNote?.invoiceDate,
    ),
    creditNoteNumber: pickText(creditNote?.creditNoteNumber),
    creditNoteDate: pickText(creditNote?.creditNoteDate),
    purchaserName: pickText(invoice?.purchaserName, creditNote?.purchaserName),
    purchaserGstin: pickText(invoice?.purchaserGstin, creditNote?.purchaserGstin),
    purchaserAddress: pickText(invoice?.purchaserAddress, creditNote?.purchaserAddress),
    supplierName: pickText(invoice?.supplierName, creditNote?.supplierName),
    supplierGstin: pickText(invoice?.supplierGstin, creditNote?.supplierGstin),
    taxableValue: amountSource.taxableValue,
    cgst: amountSource.cgst,
    sgst: amountSource.sgst,
    igst: amountSource.igst,
    cess: amountSource.cess,
    creditNoteKind: (tax > 0 ? "gst" : "financial") as CreditNoteKind,
  };

  const filled = Object.entries(fields)
    .filter(([, value]) => (typeof value === "number" ? value > 0 : Boolean(value)))
    .map(([key]) => key);

  const warnings: string[] = [];
  if (!fields.creditNoteNumber) warnings.push("Could not read the credit-note number. Type it if you can see it on the paper.");
  if (!fields.originalInvoiceNumber) warnings.push("Could not read the original invoice number.");
  if (!fields.purchaserGstin || !fields.supplierGstin) {
    warnings.push("Check both GSTINs. We fill them when the PDF has clear Bill To / seller labels.");
  }
  if (fields.creditNoteKind === "gst" && tax === 0) {
    warnings.push("No GST amounts were found on the credit note.");
  }

  return { ...fields, filled, warnings };
}
