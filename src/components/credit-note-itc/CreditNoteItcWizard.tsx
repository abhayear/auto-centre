"use client";

import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { CreditNoteItcDeclaration } from "@/components/credit-note-itc/CreditNoteItcDeclaration";
import {
  CREDIT_NOTE_ITC_DISCLAIMER,
  buildCreditNoteItcDeclaration,
  decideCreditNoteItc,
  isValidGstin,
  normalizeItcAvailment,
  type CreditNoteItcInput,
  type CreditNoteKind,
  type CreditNoteReason,
  type ImsStatus,
  type ItcAvailedExtent,
} from "@/lib/credit-note-itc";

export type CreditNoteItcFormValue = CreditNoteItcInput;

const empty = (overrides?: Partial<CreditNoteItcFormValue>): CreditNoteItcFormValue => {
  const availment = normalizeItcAvailment({
    itcAlreadyClaimed: overrides?.itcAlreadyClaimed ?? true,
    itcAvailedExtent: overrides?.itcAvailedExtent,
    itcAvailedAmount: overrides?.itcAvailedAmount,
  });
  return {
    creditNoteKind: "gst",
    reason: "post_sale_discount",
    imsStatus: "accept",
    taxableValue: 0,
    cgst: 0,
    sgst: 0,
    igst: 0,
    cess: 0,
    reversalPeriod: "",
    originalInvoiceNumber: "",
    originalInvoiceDate: "",
    creditNoteNumber: "",
    creditNoteDate: "",
    purchaserName: "",
    purchaserGstin: "",
    purchaserAddress: "",
    supplierName: "",
    supplierGstin: "",
    ...overrides,
    ...availment,
  };
};

function hasPrintFields(v: CreditNoteItcFormValue): boolean {
  return Boolean(
    v.originalInvoiceNumber.trim() &&
      v.originalInvoiceDate &&
      v.creditNoteNumber.trim() &&
      v.creditNoteDate &&
      v.purchaserName.trim() &&
      v.purchaserGstin.trim() &&
      v.purchaserAddress.trim() &&
      v.supplierName.trim() &&
      v.supplierGstin.trim(),
  );
}

function GstinHint({ value }: { value: string }) {
  if (!value.trim() || isValidGstin(value)) return null;
  return <p className="text-xs text-amber-400">GSTIN format looks invalid — you can still print.</p>;
}

export function CreditNoteItcWizard({
  mode,
  initial,
  saving = false,
  onSave,
}: {
  mode: "public" | "staff";
  initial?: Partial<CreditNoteItcFormValue>;
  saving?: boolean;
  onSave?: (payload: CreditNoteItcFormValue) => void;
}) {
  const [value, setValue] = useState(() => empty(initial));
  const taxSum = value.cgst + value.sgst + value.igst + value.cess;
  const extent = value.itcAvailedExtent ?? (value.itcAlreadyClaimed ? "full" : "none");
  const ready =
    (value.creditNoteKind === "financial" || taxSum > 0) &&
    (extent !== "part" || (value.itcAvailedAmount ?? 0) > 0);
  const decision = useMemo(
    () => (ready ? decideCreditNoteItc(value) : null),
    [ready, value],
  );
  const letter =
    decision && hasPrintFields(value) ? buildCreditNoteItcDeclaration(value, decision) : null;

  function patch(p: Partial<CreditNoteItcFormValue>) {
    setValue((cur) => ({ ...cur, ...p }));
  }

  function handlePrint() {
    if (!hasPrintFields(value) || !decision) {
      toast.error("Add invoice, credit-note, and GSTIN details to print");
      return;
    }
    window.print();
  }

  return (
    <div className="space-y-6">
      <p className="print:hidden rounded-lg border border-amber-600/40 bg-amber-500/10 p-3 text-sm text-amber-100">
        {CREDIT_NOTE_ITC_DISCLAIMER}
      </p>

      <div className="print:hidden grid gap-4 sm:grid-cols-2">
        <Select
          id="itcAvailedExtent"
          label="How much ITC did you actually claim on the original invoice?"
          value={extent}
          onChange={(e) => {
            const itcAvailedExtent = e.target.value as ItcAvailedExtent;
            patch({
              itcAvailedExtent,
              itcAlreadyClaimed: itcAvailedExtent !== "none",
              itcAvailedAmount: itcAvailedExtent === "part" ? value.itcAvailedAmount : 0,
            });
          }}
          options={[
            { value: "full", label: "Full ITC on that invoice" },
            { value: "part", label: "Only part of the ITC" },
            { value: "none", label: "None — ITC was not availed" },
          ]}
        />
        <Select
          id="creditNoteKind"
          label="Credit note type"
          value={value.creditNoteKind}
          onChange={(e) => patch({ creditNoteKind: e.target.value as CreditNoteKind })}
          options={[
            { value: "gst", label: "GST credit note (with tax)" },
            { value: "financial", label: "Financial credit note (no GST)" },
          ]}
        />
        <Select
          id="reason"
          label="Why was it issued?"
          value={value.reason}
          onChange={(e) => patch({ reason: e.target.value as CreditNoteReason })}
          options={[
            { value: "return", label: "Return of goods / services" },
            { value: "post_sale_discount", label: "Post-sale discount / scheme" },
            { value: "value_or_tax_reduced", label: "Value or tax reduced" },
          ]}
        />
        <Select
          id="imsStatus"
          label="IMS action on this credit note"
          value={value.imsStatus}
          onChange={(e) => patch({ imsStatus: e.target.value as ImsStatus })}
          options={[
            { value: "accept", label: "Accept" },
            { value: "reject", label: "Reject" },
            { value: "pending", label: "Pending (one tax period)" },
            { value: "no_action", label: "No action (deemed accept)" },
            { value: "not_on_ims", label: "Not on IMS yet" },
          ]}
        />
        {extent === "part" ? (
          <Input
            id="itcAvailedAmount"
            type="number"
            min={0}
            step="0.01"
            label="ITC actually availed / to reverse (₹ tax)"
            value={value.itcAvailedAmount || ""}
            onChange={(e) => patch({ itcAvailedAmount: Number(e.target.value) || 0 })}
          />
        ) : null}
      </div>

      <div className="print:hidden grid gap-4 sm:grid-cols-3">
        <Input id="taxableValue" type="number" min={0} step="0.01" label="Taxable value (₹)" value={value.taxableValue || ""} onChange={(e) => patch({ taxableValue: Number(e.target.value) || 0 })} />
        <Input id="cgst" type="number" min={0} step="0.01" label="CGST (₹)" value={value.cgst || ""} onChange={(e) => patch({ cgst: Number(e.target.value) || 0 })} />
        <Input id="sgst" type="number" min={0} step="0.01" label="SGST (₹)" value={value.sgst || ""} onChange={(e) => patch({ sgst: Number(e.target.value) || 0 })} />
        <Input id="igst" type="number" min={0} step="0.01" label="IGST (₹)" value={value.igst || ""} onChange={(e) => patch({ igst: Number(e.target.value) || 0 })} />
        <Input id="cess" type="number" min={0} step="0.01" label="Cess (₹)" value={value.cess || ""} onChange={(e) => patch({ cess: Number(e.target.value) || 0 })} />
        <Input id="reversalPeriod" type="month" label="GSTR-3B period (if reversing)" value={value.reversalPeriod ?? ""} onChange={(e) => patch({ reversalPeriod: e.target.value })} />
      </div>

      <div className="print:hidden grid gap-4 sm:grid-cols-2">
        <Input id="originalInvoiceNumber" label="Original invoice number" value={value.originalInvoiceNumber} onChange={(e) => patch({ originalInvoiceNumber: e.target.value })} />
        <Input id="originalInvoiceDate" type="date" label="Original invoice date" value={value.originalInvoiceDate} onChange={(e) => patch({ originalInvoiceDate: e.target.value })} />
        <Input id="creditNoteNumber" label="Credit note number" value={value.creditNoteNumber} onChange={(e) => patch({ creditNoteNumber: e.target.value })} />
        <Input id="creditNoteDate" type="date" label="Credit note date" value={value.creditNoteDate} onChange={(e) => patch({ creditNoteDate: e.target.value })} />
        <Input id="purchaserName" label="Purchaser name" value={value.purchaserName} onChange={(e) => patch({ purchaserName: e.target.value })} />
        <div>
          <Input id="purchaserGstin" label="Purchaser GSTIN" value={value.purchaserGstin} onChange={(e) => patch({ purchaserGstin: e.target.value.toUpperCase() })} />
          <GstinHint value={value.purchaserGstin} />
        </div>
        <Input id="purchaserAddress" label="Purchaser address" value={value.purchaserAddress} onChange={(e) => patch({ purchaserAddress: e.target.value })} />
        <Input id="supplierName" label="Supplier name" value={value.supplierName} onChange={(e) => patch({ supplierName: e.target.value })} />
        <div>
          <Input id="supplierGstin" label="Supplier GSTIN" value={value.supplierGstin} onChange={(e) => patch({ supplierGstin: e.target.value.toUpperCase() })} />
          <GstinHint value={value.supplierGstin} />
        </div>
      </div>

      {decision ? (
        <div className="print:hidden rounded-xl border border-red-600/30 bg-red-600/10 p-4">
          <p className="font-semibold text-white">{decision.summary}</p>
          {decision.gstr3bTable ? (
            <p className="mt-1 text-sm text-slate-300">
              GSTR-3B {decision.gstr3bTable}
              {decision.reverseTaxTotal != null && decision.action === "reverse_itc"
                ? ` · reverse ₹${decision.reverseTaxTotal}`
                : ""}
            </p>
          ) : null}
        </div>
      ) : (
        <p className="print:hidden text-sm text-slate-400">
          Enter tax amounts on a GST credit note (or choose financial) to see the decision.
        </p>
      )}

      <div className="print:hidden flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={handlePrint}>
          Print / Save as PDF
        </Button>
        {mode === "staff" && onSave ? (
          <Button type="button" loading={saving} disabled={!ready} onClick={() => onSave(value)}>
            Save
          </Button>
        ) : null}
      </div>

      {letter ? <CreditNoteItcDeclaration letter={letter} /> : null}
    </div>
  );
}
