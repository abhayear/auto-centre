import { describe, expect, it } from "vitest";
import {
  buildCreditNoteItcDeclaration,
  decideCreditNoteItc,
  isValidGstin,
} from "@/lib/credit-note-itc";
import { creditNoteItcCaseSchema, creditNoteItcCaseUpdateSchema } from "@/lib/validators";

const base = {
  itcAlreadyClaimed: true,
  creditNoteKind: "gst" as const,
  imsStatus: "accept" as const,
};

describe("decideCreditNoteItc", () => {
  it("treats a financial credit note as no GST ITC reversal", () => {
    const d = decideCreditNoteItc({ ...base, creditNoteKind: "financial" });
    expect(d.action).toBe("no_reversal");
    expect(d.declarationKind).toBe("not_applicable");
    expect(d.gstr3bTable).toBeNull();
  });

  it("keeps ITC when the purchaser rejects on IMS", () => {
    const d = decideCreditNoteItc({ ...base, imsStatus: "reject" });
    expect(d.action).toBe("keep_itc");
    expect(d.declarationKind).toBe("rejected");
  });

  it("waits when the credit note is not on IMS yet", () => {
    const d = decideCreditNoteItc({ ...base, imsStatus: "not_on_ims" });
    expect(d.action).toBe("wait");
  });

  it("does not reverse when ITC was never claimed", () => {
    const d = decideCreditNoteItc({ ...base, itcAlreadyClaimed: false });
    expect(d.action).toBe("no_reversal");
    expect(d.declarationKind).toBe("not_availed");
  });

  it("reverses in GSTR-3B Table 4(B)(2) when ITC was already claimed and IMS is accept", () => {
    const d = decideCreditNoteItc(base);
    expect(d.action).toBe("reverse_itc");
    expect(d.gstr3bTable).toBe("4(B)(2)");
    expect(d.declarationKind).toBe("reversal");
  });
});

describe("isValidGstin", () => {
  it("accepts a 15-character GSTIN pattern", () => {
    expect(isValidGstin("09ABCDE1234F1Z5")).toBe(true);
    expect(isValidGstin("bad")).toBe(false);
  });
});

describe("buildCreditNoteItcDeclaration", () => {
  const input = {
    itcAlreadyClaimed: true,
    creditNoteKind: "gst" as const,
    reason: "post_sale_discount" as const,
    imsStatus: "accept" as const,
    taxableValue: 10000,
    cgst: 900,
    sgst: 900,
    igst: 0,
    cess: 0,
    reversalPeriod: "2026-09",
    originalInvoiceNumber: "INV-1",
    originalInvoiceDate: "2026-08-01",
    creditNoteNumber: "CN-9",
    creditNoteDate: "2026-09-10",
    purchaserName: "Auto Galaxy",
    purchaserGstin: "09ABCDE1234F1Z5",
    purchaserAddress: "Lalitpur",
    supplierName: "OEM",
    supplierGstin: "27ABCDE1234F1Z5",
  };

  it("includes CN number, tax heads, and reversal month when reversing", () => {
    const decision = decideCreditNoteItc(input);
    const letter = buildCreditNoteItcDeclaration(input, decision);
    expect(letter.rows[0]?.creditNoteNumber).toBe("CN-9");
    expect(letter.rows[0]?.cgst).toBe(900);
    expect(letter.statement).toContain("4(B)(2)");
    expect(letter.statement).toContain("2026-09");
  });

  it("uses wait-specific wording for a GST credit note not on IMS", () => {
    const waitInput = { ...input, imsStatus: "not_on_ims" as const };
    const decision = decideCreditNoteItc(waitInput);
    const letter = buildCreditNoteItcDeclaration(waitInput, decision);
    expect(decision.action).toBe("wait");
    expect(decision.declarationKind).toBe("not_applicable");
    expect(letter.statement).not.toContain("financial");
    expect(letter.statement).toContain("Invoice Management System");
  });
});

describe("creditNoteItcCaseUpdateSchema", () => {
  it("does not default tax amounts on a status-only PATCH", () => {
    const parsed = creditNoteItcCaseUpdateSchema.parse({ status: "itc_reversed" });
    expect(parsed).not.toHaveProperty("cgst");
    expect(parsed).not.toHaveProperty("sgst");
    expect(parsed).not.toHaveProperty("igst");
    expect(parsed).not.toHaveProperty("cess");
    expect(parsed).not.toHaveProperty("taxableValue");
  });
});

describe("creditNoteItcCaseSchema", () => {
  const createBase = {
    purchaserName: "Auto Galaxy",
    purchaserGstin: "09ABCDE1234F1Z5",
    purchaserAddress: "Lalitpur",
    supplierName: "OEM",
    supplierGstin: "27ABCDE1234F1Z5",
    originalInvoiceNumber: "INV-1",
    originalInvoiceDate: "2026-08-01",
    creditNoteNumber: "CN-9",
    creditNoteDate: "2026-09-10",
    itcAlreadyClaimed: true,
    creditNoteKind: "gst" as const,
    reason: "post_sale_discount" as const,
    imsStatus: "accept" as const,
    taxableValue: 10000,
  };

  it("requires a tax sum on GST credit notes", () => {
    expect(creditNoteItcCaseSchema.safeParse(createBase).success).toBe(false);
    expect(creditNoteItcCaseSchema.safeParse({ ...createBase, cgst: 900 }).success).toBe(true);
  });

  it("allows a financial credit note with zero tax", () => {
    const parsed = creditNoteItcCaseSchema.parse({ ...createBase, creditNoteKind: "financial" });
    expect(parsed.cgst).toBe(0);
    expect(parsed.sgst).toBe(0);
    expect(parsed.igst).toBe(0);
    expect(parsed.cess).toBe(0);
  });
});
