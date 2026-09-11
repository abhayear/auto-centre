import { CreditNoteItcWizard } from "@/components/credit-note-itc/CreditNoteItcWizard";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Credit note ITC (purchaser)",
  description:
    "Decide GST ITC reversal for a supplier credit note and print a purchaser self-declaration.",
};

export default function CreditNoteItcPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold text-white">Credit note ITC (purchaser)</h1>
      <p className="mt-2 text-slate-400">
        For the registered buyer who received a GST credit note. Get the reversal decision and print a
        declaration for the supplier.
      </p>
      <div className="mt-8">
        <CreditNoteItcWizard mode="public" />
      </div>
    </div>
  );
}
