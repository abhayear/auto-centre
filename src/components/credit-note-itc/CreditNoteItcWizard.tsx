"use client";

import { FileUp, Loader2 } from "lucide-react";
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
import type { CreditNoteItcAutofill } from "@/lib/credit-note-itc-extract";

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

function applyAutofill(
  current: CreditNoteItcFormValue,
  fields: CreditNoteItcAutofill,
): CreditNoteItcFormValue {
  const next = { ...current };
  const textKeys = [
    "originalInvoiceNumber",
    "originalInvoiceDate",
    "creditNoteNumber",
    "creditNoteDate",
    "purchaserName",
    "purchaserGstin",
    "purchaserAddress",
    "supplierName",
    "supplierGstin",
  ] as const;
  const numberKeys = ["taxableValue", "cgst", "sgst", "igst", "cess"] as const;

  for (const key of textKeys) {
    const value = fields[key]?.trim();
    if (value) next[key] = value;
  }
  for (const key of numberKeys) {
    if (fields[key] > 0) next[key] = fields[key];
  }
  if (fields.creditNoteKind) next.creditNoteKind = fields.creditNoteKind;
  if (fields.itcAvailedExtent) {
    next.itcAvailedExtent = fields.itcAvailedExtent;
    next.itcAlreadyClaimed = fields.itcAvailedExtent !== "none";
    if (fields.itcAvailedExtent !== "part") next.itcAvailedAmount = 0;
  }
  if (fields.imsStatus) next.imsStatus = fields.imsStatus;
  if (fields.reason) next.reason = fields.reason;
  if (fields.reversalPeriod) next.reversalPeriod = fields.reversalPeriod;
  return next;
}

function QuestionUpload({
  id,
  check,
  uploadLabel,
  fileName,
  reading,
  onUpload,
}: {
  id: string;
  check: string;
  uploadLabel: string;
  fileName?: string;
  reading?: boolean;
  onUpload: (file: File) => void;
}) {
  return (
    <div className="space-y-2">
      <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">or upload</p>
      <p className="text-xs text-slate-500">Check: {check}</p>
      <label
        htmlFor={id}
        className="inline-flex w-full cursor-pointer items-center gap-2 rounded-lg border border-dashed border-slate-600 bg-slate-900/70 px-3 py-2 text-xs text-slate-200 hover:border-red-500/70"
      >
        {reading ? <Loader2 className="h-3.5 w-3.5 animate-spin text-red-400" /> : <FileUp className="h-3.5 w-3.5 text-red-400" />}
        <span className="truncate">{reading ? "Reading…" : fileName || uploadLabel}</span>
        <input
          id={id}
          type="file"
          accept=".pdf,image/jpeg,image/png,image/webp,.jpg,.jpeg,.png"
          className="sr-only"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) onUpload(file);
          }}
        />
      </label>
    </div>
  );
}

function FileCard({
  id,
  title,
  hint,
  file,
  onChange,
}: {
  id: string;
  title: string;
  hint: string;
  file: File | null;
  onChange: (file: File | null) => void;
}) {
  return (
    <label
      htmlFor={id}
      className="flex cursor-pointer flex-col gap-2 rounded-xl border border-dashed border-slate-600 bg-slate-900/60 p-4 hover:border-red-500/70"
    >
      <span className="flex items-center gap-2 text-sm font-medium text-white">
        <FileUp className="h-4 w-4 text-red-400" />
        {title}
      </span>
      <span className="text-xs text-slate-400">{hint}</span>
      <span className="truncate text-sm text-slate-200">
        {file ? file.name : "Tap to choose PDF or photo"}
      </span>
      <input
        id={id}
        type="file"
        accept=".pdf,image/jpeg,image/png,image/webp,.jpg,.jpeg,.png"
        className="sr-only"
        onChange={(event) => onChange(event.target.files?.[0] ?? null)}
      />
    </label>
  );
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
  const [invoiceFile, setInvoiceFile] = useState<File | null>(null);
  const [creditNoteFile, setCreditNoteFile] = useState<File | null>(null);
  const [reading, setReading] = useState(false);
  const [readingQuestion, setReadingQuestion] = useState<string | null>(null);
  const [gstr3bName, setGstr3bName] = useState("");
  const [imsName, setImsName] = useState("");
  const [reasonFileName, setReasonFileName] = useState("");
  const [gstFileName, setGstFileName] = useState("");
  const [picked, setPicked] = useState<string[]>([]);
  const [notes, setNotes] = useState<string[]>([]);
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

  async function postExtract(body: FormData) {
    const res = await fetch("/api/credit-note-itc/extract", { method: "POST", body });
    const result = (await res.json()) as {
      error?: string;
      fields?: CreditNoteItcAutofill;
      warnings?: string[];
    };
    if (!res.ok || !result.fields) {
      throw new Error(result.error ?? "Could not read those files");
    }
    setValue((cur) => applyAutofill(cur, result.fields!));
    setPicked((cur) => [...new Set([...cur, ...result.fields!.filled])]);
    setNotes(result.warnings ?? result.fields.warnings ?? []);
    return result.fields;
  }

  async function handleReadDocuments() {
    if (!invoiceFile && !creditNoteFile) {
      toast.error("Choose the invoice and the credit note first");
      return;
    }
    setReading(true);
    try {
      const body = new FormData();
      if (invoiceFile) body.set("invoice", invoiceFile);
      if (creditNoteFile) body.set("creditNote", creditNoteFile);
      const fields = await postExtract(body);
      if (creditNoteFile) {
        setReasonFileName(creditNoteFile.name);
        setGstFileName(creditNoteFile.name);
      }
      toast.success(
        fields.filled.length > 0
          ? `Filled ${fields.filled.length} boxes — check them once`
          : "Nothing clear was found. Type the boxes below.",
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not read those files");
    } finally {
      setReading(false);
    }
  }

  async function handleQuestionUpload(
    key: "gstr3b" | "ims" | "creditNote",
    file: File,
    label: string,
  ) {
    setReadingQuestion(key);
    try {
      const body = new FormData();
      body.set(key, file);
      if (key === "creditNote" && invoiceFile) body.set("invoice", invoiceFile);
      const fields = await postExtract(body);
      if (key === "gstr3b") setGstr3bName(file.name);
      if (key === "ims") setImsName(file.name);
      if (key === "creditNote") {
        setReasonFileName(file.name);
        setGstFileName(file.name);
        setCreditNoteFile(file);
      }
      toast.success(
        fields.filled.length > 0
          ? `Read ${label} — dropdown updated. Check it.`
          : `Read ${label}, but pick the dropdown yourself.`,
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not read that file");
    } finally {
      setReadingQuestion(null);
    }
  }

  function handlePrint() {
    if (!hasPrintFields(value) || !decision) {
      toast.error("Add invoice, credit-note, and GSTIN details to print");
      return;
    }
    window.print();
  }

  return (
    <div className="space-y-8">
      <p className="print:hidden rounded-lg border border-amber-600/40 bg-amber-500/10 p-3 text-sm text-amber-100">
        {CREDIT_NOTE_ITC_DISCLAIMER}
      </p>

      <section className="print:hidden space-y-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-red-300">Step 1</p>
          <h2 className="text-lg font-semibold text-white">Upload the two papers</h2>
          <p className="mt-1 text-sm text-slate-400">
            Original purchase invoice and the seller&apos;s credit note. PDF from Tally is best.
            Phone photos also work. If you swap the files, we still try to tell them apart.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <FileCard
            id="invoice-upload"
            title="Original invoice"
            hint="The purchase bill where you took ITC"
            file={invoiceFile}
            onChange={setInvoiceFile}
          />
          <FileCard
            id="credit-note-upload"
            title="Credit note"
            hint="The CN the seller issued to you"
            file={creditNoteFile}
            onChange={setCreditNoteFile}
          />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button type="button" onClick={() => void handleReadDocuments()} disabled={reading}>
            {reading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileUp className="h-4 w-4" />}
            {reading ? "Reading…" : "Read and fill the boxes"}
          </Button>
          <p className="text-xs text-slate-500">We do not save the files. Only the numbers you keep.</p>
        </div>
        {notes.length > 0 ? (
          <ul className="rounded-lg border border-amber-600/30 bg-amber-500/5 p-3 text-sm text-amber-100">
            {notes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        ) : null}
        {picked.length > 0 ? (
          <p className="text-sm text-emerald-300">
            Auto-filled {picked.length} fields. Correct anything that looks wrong — you are the check.
          </p>
        ) : null}
      </section>

      <section className="print:hidden space-y-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-red-300">Step 2</p>
          <h2 className="text-lg font-semibold text-white">Answer from your GST papers</h2>
          <p className="mt-1 text-sm text-slate-400">
            Both options work: pick from the dropdown, or upload the paper. Upload fills the
            dropdown; you can still change it by hand.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Select
              id="itcAvailedExtent"
              label="Did you already take GST credit (ITC) on that purchase bill in a filed GSTR-3B?"
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
                { value: "full", label: "Yes — full ITC on that invoice" },
                { value: "part", label: "Yes — but only part of the ITC" },
                { value: "none", label: "No — I never took ITC on it" },
              ]}
            />
            <QuestionUpload
              id="gstr3b-upload"
              check="Your GSTR-3B for the period when you claimed the original invoice"
              uploadLabel="Upload GSTR-3B PDF or photo"
              fileName={gstr3bName}
              reading={readingQuestion === "gstr3b"}
              onUpload={(file) => void handleQuestionUpload("gstr3b", file, "GSTR-3B")}
            />
          </div>
          <div className="space-y-2">
            <Select
              id="imsStatus"
              label="On the GST portal (IMS), what did you do with this credit note?"
              value={value.imsStatus}
              onChange={(e) => patch({ imsStatus: e.target.value as ImsStatus })}
              options={[
                { value: "accept", label: "Accept — the credit note is correct" },
                { value: "reject", label: "Reject — it is wrong / not ours" },
                { value: "pending", label: "Pending — parked for this tax period" },
                { value: "no_action", label: "Left it — deemed accept after due date" },
                { value: "not_on_ims", label: "I have not seen it on IMS yet" },
              ]}
            />
            <QuestionUpload
              id="ims-upload"
              check="IMS → Credit Notes → Status / action"
              uploadLabel="Upload IMS screenshot or PDF"
              fileName={imsName}
              reading={readingQuestion === "ims"}
              onUpload={(file) => void handleQuestionUpload("ims", file, "IMS")}
            />
          </div>
          <div className="space-y-2">
            <Select
              id="reason"
              label="Why did the seller issue this credit note?"
              value={value.reason}
              onChange={(e) => patch({ reason: e.target.value as CreditNoteReason })}
              options={[
                { value: "return", label: "We returned goods / cancelled the job" },
                { value: "post_sale_discount", label: "Discount / scheme after the sale" },
                { value: "value_or_tax_reduced", label: "Price or tax was reduced" },
              ]}
            />
            <QuestionUpload
              id="reason-upload"
              check="Actual credit note PDF/details from seller — discount, return, rate difference"
              uploadLabel="Upload credit note again if needed"
              fileName={reasonFileName}
              reading={readingQuestion === "creditNote"}
              onUpload={(file) => void handleQuestionUpload("creditNote", file, "credit note")}
            />
          </div>
          <div className="space-y-2">
            <Select
              id="creditNoteKind"
              label="Does this credit note have GST on it?"
              value={value.creditNoteKind}
              onChange={(e) => patch({ creditNoteKind: e.target.value as CreditNoteKind })}
              options={[
                { value: "gst", label: "Yes — GST credit note (CGST/SGST or IGST)" },
                { value: "financial", label: "No — only a commercial / financial CN" },
              ]}
            />
            <QuestionUpload
              id="cn-gst-upload"
              check="Credit note itself — check CGST / SGST / IGST amounts"
              uploadLabel="Upload credit note to read GST"
              fileName={gstFileName}
              reading={readingQuestion === "creditNote"}
              onUpload={(file) => void handleQuestionUpload("creditNote", file, "credit note")}
            />
          </div>
          {extent === "part" ? (
            <Input
              id="itcAvailedAmount"
              type="number"
              min={0}
              step="0.01"
              label="How much ITC did you actually take? (₹ tax only)"
              value={value.itcAvailedAmount || ""}
              onChange={(e) => patch({ itcAvailedAmount: Number(e.target.value) || 0 })}
            />
          ) : null}
        </div>
      </section>

      <section className="print:hidden space-y-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-red-300">Step 3</p>
          <h2 className="text-lg font-semibold text-white">Check the numbers we picked</h2>
          <p className="mt-1 text-sm text-slate-400">
            Tax amounts should come from the credit note, not the original invoice.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <Input id="taxableValue" type="number" min={0} step="0.01" label="Taxable value on CN (₹)" value={value.taxableValue || ""} onChange={(e) => patch({ taxableValue: Number(e.target.value) || 0 })} />
          <Input id="cgst" type="number" min={0} step="0.01" label="CGST (₹)" value={value.cgst || ""} onChange={(e) => patch({ cgst: Number(e.target.value) || 0 })} />
          <Input id="sgst" type="number" min={0} step="0.01" label="SGST (₹)" value={value.sgst || ""} onChange={(e) => patch({ sgst: Number(e.target.value) || 0 })} />
          <Input id="igst" type="number" min={0} step="0.01" label="IGST (₹)" value={value.igst || ""} onChange={(e) => patch({ igst: Number(e.target.value) || 0 })} />
          <Input id="cess" type="number" min={0} step="0.01" label="Cess (₹)" value={value.cess || ""} onChange={(e) => patch({ cess: Number(e.target.value) || 0 })} />
          <Input id="reversalPeriod" type="month" label="GSTR-3B month (if reversing)" value={value.reversalPeriod ?? ""} onChange={(e) => patch({ reversalPeriod: e.target.value })} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input id="originalInvoiceNumber" label="Original invoice number" value={value.originalInvoiceNumber} onChange={(e) => patch({ originalInvoiceNumber: e.target.value })} />
          <Input id="originalInvoiceDate" type="date" label="Original invoice date" value={value.originalInvoiceDate} onChange={(e) => patch({ originalInvoiceDate: e.target.value })} />
          <Input id="creditNoteNumber" label="Credit note number" value={value.creditNoteNumber} onChange={(e) => patch({ creditNoteNumber: e.target.value })} />
          <Input id="creditNoteDate" type="date" label="Credit note date" value={value.creditNoteDate} onChange={(e) => patch({ creditNoteDate: e.target.value })} />
          <Input id="purchaserName" label="Your shop / purchaser name" value={value.purchaserName} onChange={(e) => patch({ purchaserName: e.target.value })} />
          <div>
            <Input id="purchaserGstin" label="Your GSTIN" value={value.purchaserGstin} onChange={(e) => patch({ purchaserGstin: e.target.value.toUpperCase() })} />
            <GstinHint value={value.purchaserGstin} />
          </div>
          <Input id="purchaserAddress" label="Your address" value={value.purchaserAddress} onChange={(e) => patch({ purchaserAddress: e.target.value })} />
          <Input id="supplierName" label="Seller name" value={value.supplierName} onChange={(e) => patch({ supplierName: e.target.value })} />
          <div>
            <Input id="supplierGstin" label="Seller GSTIN" value={value.supplierGstin} onChange={(e) => patch({ supplierGstin: e.target.value.toUpperCase() })} />
            <GstinHint value={value.supplierGstin} />
          </div>
        </div>
      </section>

      {decision ? (
        <div className="print:hidden rounded-xl border border-red-600/30 bg-red-600/10 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-red-300">What to do</p>
          <p className="mt-1 font-semibold text-white">{decision.summary}</p>
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
          Upload the papers or type the credit-note tax amounts to see what to do.
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
