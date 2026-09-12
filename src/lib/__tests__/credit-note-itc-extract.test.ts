import { describe, expect, it } from "vitest";
import {
  detectGstDocumentKind,
  mergeGstDocumentExtracts,
  normalizeExtractedText,
  parseGstDocumentText,
  toIsoDate,
} from "../credit-note-itc-extract";
import { validateGstDocumentFile } from "../credit-note-itc-read";

const INVOICE_TEXT = `
TAX INVOICE
Yakuza EV Components
GSTIN: 09ABCDE1234F1Z5
Civil Lines, Kanpur, Uttar Pradesh
Bill To
Auto Galaxy
GSTIN: 09XYZAB5678C1Z2
Near Bus Stand, Lalitpur
Invoice No.: AG/INV/2026/0142
Invoice Date: 12/08/2026
Taxable Value  10,000.00
CGST @ 9%         900.00
SGST @ 9%         900.00
Total            11,800.00
`;

const CREDIT_NOTE_TEXT = `
CREDIT NOTE
Yakuza EV Components
GSTIN: 09ABCDE1234F1Z5
Bill To / Recipient
Auto Galaxy
GSTIN: 09XYZAB5678C1Z2
Credit Note No. CN/2026/0018
Date: 05/09/2026
Against Invoice No: AG/INV/2026/0142 dated 12-08-2026
Taxable Amount     2,000.00
CGST                 180.00
SGST                 180.00
`;

describe("normalizeExtractedText", () => {
  it("joins words split across PDF line breaks", () => {
    expect(normalizeExtractedText("GSTI\nN: 09ABCDE1234F1Z5 Taxabl\ne Value 2000 SGST 1\n80.00")).toContain(
      "GSTIN: 09ABCDE1234F1Z5 Taxable Value 2000 SGST 180.00",
    );
  });
});

describe("toIsoDate", () => {
  it("reads Indian DD/MM/YYYY dates", () => {
    expect(toIsoDate("12/08/2026")).toBe("2026-08-12");
    expect(toIsoDate("5-9-2026")).toBe("2026-09-05");
    expect(toIsoDate("05 Sep 2026")).toBe("2026-09-05");
  });
});

describe("detectGstDocumentKind", () => {
  it("tells invoices and credit notes apart", () => {
    expect(detectGstDocumentKind(INVOICE_TEXT)).toBe("invoice");
    expect(detectGstDocumentKind(CREDIT_NOTE_TEXT)).toBe("credit_note");
  });
});

describe("parseGstDocumentText", () => {
  it("picks invoice number, date, parties, and tax", () => {
    const parsed = parseGstDocumentText(INVOICE_TEXT, "invoice");
    expect(parsed.invoiceNumber).toBe("AG/INV/2026/0142");
    expect(parsed.invoiceDate).toBe("2026-08-12");
    expect(parsed.supplierGstin).toBe("09ABCDE1234F1Z5");
    expect(parsed.purchaserGstin).toBe("09XYZAB5678C1Z2");
    expect(parsed.supplierName).toMatch(/Yakuza/i);
    expect(parsed.purchaserName).toMatch(/Auto Galaxy/i);
    expect(parsed.taxableValue).toBe(10000);
    expect(parsed.cgst).toBe(900);
    expect(parsed.sgst).toBe(900);
  });

  it("picks credit-note number, original invoice, and reduced tax", () => {
    const parsed = parseGstDocumentText(CREDIT_NOTE_TEXT, "credit_note");
    expect(parsed.documentKind).toBe("credit_note");
    expect(parsed.creditNoteNumber).toBe("CN/2026/0018");
    expect(parsed.creditNoteDate).toBe("2026-09-05");
    expect(parsed.originalInvoiceNumber).toBe("AG/INV/2026/0142");
    expect(parsed.originalInvoiceDate).toBe("2026-08-12");
    expect(parsed.taxableValue).toBe(2000);
    expect(parsed.cgst).toBe(180);
    expect(parsed.sgst).toBe(180);
  });

  it("reads a single-line Tally-style dump", () => {
    const parsed = parseGstDocumentText(
      "TAX INVOICE Yakuza EV Components GSTIN: 09ABCDE1234F1Z5 Bill To Auto Galaxy GSTIN: 09XYZAB5678C1Z2 Invoice No.: AG/INV/2026/0142 Invoice Date: 12/08/2026 Taxable Value 10000.00 CGST 900.00 SGST 900.00",
      "invoice",
    );
    expect(parsed.invoiceNumber).toBe("AG/INV/2026/0142");
    expect(parsed.invoiceDate).toBe("2026-08-12");
    expect(parsed.supplierGstin).toBe("09ABCDE1234F1Z5");
    expect(parsed.purchaserGstin).toBe("09XYZAB5678C1Z2");
    expect(parsed.taxableValue).toBe(10000);
    expect(parsed.cgst).toBe(900);
  });

  it("reads IGST-only interstate notes", () => {
    const parsed = parseGstDocumentText(
      `
      CREDIT NOTE
      Credit Note Number: CN-77
      Date: 01/04/2026
      Taxable Value 5000
      IGST 900
      `,
      "credit_note",
    );
    expect(parsed.igst).toBe(900);
    expect(parsed.cgst).toBe(0);
  });
});

describe("mergeGstDocumentExtracts", () => {
  it("uses invoice for parties and original bill, credit note for amounts", () => {
    const merged = mergeGstDocumentExtracts(
      parseGstDocumentText(INVOICE_TEXT, "invoice"),
      parseGstDocumentText(CREDIT_NOTE_TEXT, "credit_note"),
    );
    expect(merged.originalInvoiceNumber).toBe("AG/INV/2026/0142");
    expect(merged.originalInvoiceDate).toBe("2026-08-12");
    expect(merged.creditNoteNumber).toBe("CN/2026/0018");
    expect(merged.creditNoteDate).toBe("2026-09-05");
    expect(merged.purchaserName).toMatch(/Auto Galaxy/i);
    expect(merged.supplierGstin).toBe("09ABCDE1234F1Z5");
    expect(merged.taxableValue).toBe(2000);
    expect(merged.creditNoteKind).toBe("gst");
    expect(merged.filled).toContain("creditNoteNumber");
  });

  it("still works if the user swaps the two files", () => {
    const merged = mergeGstDocumentExtracts(
      parseGstDocumentText(CREDIT_NOTE_TEXT),
      parseGstDocumentText(INVOICE_TEXT),
    );
    expect(merged.creditNoteNumber).toBe("CN/2026/0018");
    expect(merged.originalInvoiceNumber).toBe("AG/INV/2026/0142");
    expect(merged.taxableValue).toBe(2000);
  });

  it("rejects files that are not PDF or photos", () => {
    const file = new File(["x"], "notes.docx", { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
    expect(validateGstDocumentFile(file)).toMatch(/PDF, JPG, or PNG/i);
  });

  it("marks a no-tax credit note as financial", () => {
    const merged = mergeGstDocumentExtracts(null, {
      ...parseGstDocumentText("CREDIT NOTE\nCredit Note No CN1\nDate 01/01/2026\nTaxable Value 500"),
      cgst: 0,
      sgst: 0,
      igst: 0,
      cess: 0,
      documentKind: "credit_note",
      creditNoteNumber: "CN1",
      taxableValue: 500,
    });
    expect(merged.creditNoteKind).toBe("financial");
  });
});
