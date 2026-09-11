export const CREDIT_NOTE_KINDS = ["gst", "financial"] as const;
export type CreditNoteKind = (typeof CREDIT_NOTE_KINDS)[number];

export const CREDIT_NOTE_REASONS = ["return", "post_sale_discount", "value_or_tax_reduced"] as const;
export type CreditNoteReason = (typeof CREDIT_NOTE_REASONS)[number];

export const IMS_STATUSES = ["accept", "reject", "not_on_ims"] as const;
export type ImsStatus = (typeof IMS_STATUSES)[number];

export const CREDIT_NOTE_ITC_ACTIONS = ["no_reversal", "keep_itc", "wait", "reverse_itc"] as const;
export type CreditNoteItcAction = (typeof CREDIT_NOTE_ITC_ACTIONS)[number];

export const DECLARATION_KINDS = ["reversal", "not_availed", "rejected", "not_applicable"] as const;
export type DeclarationKind = (typeof DECLARATION_KINDS)[number];

export const CREDIT_NOTE_ITC_STATUSES = ["draft", "declaration_issued", "itc_reversed"] as const;
export type CreditNoteItcStatus = (typeof CREDIT_NOTE_ITC_STATUSES)[number];

export const GSTIN_PATTERN = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

export function isValidGstin(value: string): boolean {
  return GSTIN_PATTERN.test(value.trim().toUpperCase());
}

export function parseIsoDate(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

export type CreditNoteItcInput = {
  itcAlreadyClaimed: boolean;
  creditNoteKind: CreditNoteKind;
  reason: CreditNoteReason;
  imsStatus: ImsStatus;
  taxableValue: number;
  cgst: number;
  sgst: number;
  igst: number;
  cess: number;
  reversalPeriod?: string | null;
  originalInvoiceNumber: string;
  originalInvoiceDate: string;
  creditNoteNumber: string;
  creditNoteDate: string;
  purchaserName: string;
  purchaserGstin: string;
  purchaserAddress: string;
  supplierName: string;
  supplierGstin: string;
};

export type CreditNoteItcDecision = {
  action: CreditNoteItcAction;
  reasonCode: "financial" | "ims_reject" | "not_on_ims" | "itc_not_claimed" | "reverse_4b2";
  gstr3bTable: "4(B)(2)" | null;
  summary: string;
  declarationKind: DeclarationKind;
};

export function decideCreditNoteItc(
  input: Pick<CreditNoteItcInput, "itcAlreadyClaimed" | "creditNoteKind" | "imsStatus">,
): CreditNoteItcDecision {
  if (input.creditNoteKind === "financial") {
    return {
      action: "no_reversal",
      reasonCode: "financial",
      gstr3bTable: null,
      summary: "Financial credit note (no GST). No GST ITC reversal. Adjust books only.",
      declarationKind: "not_applicable",
    };
  }

  if (input.imsStatus === "reject") {
    return {
      action: "keep_itc",
      reasonCode: "ims_reject",
      gstr3bTable: null,
      summary: "Reject on IMS. Keep ITC. Do not reverse. The supplier cannot reduce output tax on this credit note.",
      declarationKind: "rejected",
    };
  }

  if (input.imsStatus === "not_on_ims") {
    return {
      action: "wait",
      reasonCode: "not_on_ims",
      gstr3bTable: null,
      summary:
        "Credit note is not on IMS yet. Accept or reject on IMS first. If you already claimed ITC, expect to reverse after you accept.",
      declarationKind: "not_applicable",
    };
  }

  if (!input.itcAlreadyClaimed) {
    return {
      action: "no_reversal",
      reasonCode: "itc_not_claimed",
      gstr3bTable: null,
      summary:
        "ITC was not claimed on the original invoice. GSTR-2B already nets this credit note. No extra Table 4(B) reversal. Still accept on IMS if the credit note is correct.",
      declarationKind: "not_availed",
    };
  }

  return {
    action: "reverse_itc",
    reasonCode: "reverse_4b2",
    gstr3bTable: "4(B)(2)",
    summary:
      "Accept on IMS and reverse the ITC in GSTR-3B Table 4(B)(2) for the tax period in which this credit note appears in GSTR-2B.",
    declarationKind: "reversal",
  };
}

const REASON_LABELS: Record<CreditNoteReason, string> = {
  return: "Goods or services returned",
  post_sale_discount: "Post-sale discount / scheme / rebate",
  value_or_tax_reduced: "Taxable value or tax reduced",
};

export type CreditNoteItcDeclaration = {
  title: string;
  purchaserName: string;
  purchaserGstin: string;
  purchaserAddress: string;
  supplierName: string;
  supplierGstin: string;
  reasonLabel: string;
  statement: string;
  rows: {
    creditNoteNumber: string;
    creditNoteDate: string;
    originalInvoiceNumber: string;
    originalInvoiceDate: string;
    taxableValue: number;
    cgst: number;
    sgst: number;
    igst: number;
    cess: number;
  }[];
};

export function buildCreditNoteItcDeclaration(
  input: CreditNoteItcInput,
  decision: CreditNoteItcDecision,
): CreditNoteItcDeclaration {
  const period =
    input.reversalPeriod?.trim() ||
    "the GSTR-3B of the period in which this credit note appears in GSTR-2B";

  let statement: string;
  if (decision.reasonCode === "financial") {
    statement =
      "This is a financial (non-GST) credit note. No GST Input Tax Credit reversal applies.";
  } else if (decision.reasonCode === "not_on_ims" || decision.action === "wait") {
    statement =
      "We confirm that the credit note is not on the Invoice Management System yet. Accept or reject on IMS before determining Input Tax Credit reversal.";
  } else {
    switch (decision.declarationKind) {
      case "reversal":
        statement = `We confirm that the Input Tax Credit attributable to the credit note(s) below has been reversed under Section 15(3)(b)(ii) / Section 34 of the CGST Act, as applicable, in GSTR-3B Table 4(B)(2) for ${period}.`;
        break;
      case "not_availed":
        statement =
          "We confirm that Input Tax Credit on the original invoice was not availed. Nothing remains to reverse in respect of the credit note(s) below.";
        break;
      case "rejected":
        statement =
          "We confirm that the credit note was / will be rejected on the Invoice Management System. Input Tax Credit is not being reversed.";
        break;
      default:
        statement =
          "This is a financial (non-GST) credit note. No GST Input Tax Credit reversal applies.";
    }
  }

  return {
    title: "Certificate / undertaking of ITC reversal by the recipient",
    purchaserName: input.purchaserName,
    purchaserGstin: input.purchaserGstin,
    purchaserAddress: input.purchaserAddress,
    supplierName: input.supplierName,
    supplierGstin: input.supplierGstin,
    reasonLabel: REASON_LABELS[input.reason],
    statement,
    rows: [
      {
        creditNoteNumber: input.creditNoteNumber,
        creditNoteDate: input.creditNoteDate,
        originalInvoiceNumber: input.originalInvoiceNumber,
        originalInvoiceDate: input.originalInvoiceDate,
        taxableValue: input.taxableValue,
        cgst: input.cgst,
        sgst: input.sgst,
        igst: input.igst,
        cess: input.cess,
      },
    ],
  };
}

export type CreditNoteItcCaseRecord = {
  id: string;
  purchaserName: string;
  purchaserGstin: string;
  purchaserAddress: string;
  supplierName: string;
  supplierGstin: string;
  originalInvoiceNumber: string;
  originalInvoiceDate: Date;
  creditNoteNumber: string;
  creditNoteDate: Date;
  itcAlreadyClaimed: boolean;
  creditNoteKind: string;
  reason: string;
  imsStatus: string;
  taxableValue: number;
  cgst: number;
  sgst: number;
  igst: number;
  cess: number;
  reversalPeriod: string | null;
  action: string;
  summary: string;
  declarationKind: string;
  status: string;
  createdByEmail: string;
  createdAt: Date;
  updatedAt: Date;
};

export type SerializedCreditNoteItcCase = Omit<
  CreditNoteItcCaseRecord,
  "originalInvoiceDate" | "creditNoteDate" | "createdAt" | "updatedAt"
> & {
  originalInvoiceDate: string;
  creditNoteDate: string;
  createdAt: string;
  updatedAt: string;
};

function asIsoDate(value: Date | string): string {
  if (typeof value === "string") return value.slice(0, 10);
  return value.toISOString().slice(0, 10);
}

export function serializeCreditNoteItcCase(record: CreditNoteItcCaseRecord): SerializedCreditNoteItcCase {
  return {
    ...record,
    originalInvoiceDate: asIsoDate(record.originalInvoiceDate),
    creditNoteDate: asIsoDate(record.creditNoteDate),
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}

export const CREDIT_NOTE_ITC_DISCLAIMER =
  "This assistant helps the purchaser decide GST ITC treatment of a supplier credit note under current Indian GST practice (including IMS accept/reject and GSTR-3B Table 4(B)(2)). It is not legal or tax advice. Confirm figures in GSTR-2B and GSTR-3B before filing.";
