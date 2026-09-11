"use client";

import { formatPrice } from "@/lib/utils";
import type { CreditNoteItcDeclaration as Letter } from "@/lib/credit-note-itc";

export function CreditNoteItcDeclaration({ letter }: { letter: Letter }) {
  return (
    <article className="hidden print:block">
      <h1 className="mb-4 text-center text-lg font-bold text-black">{letter.title}</h1>
      <p className="text-sm text-black">
        <strong>Recipient (purchaser):</strong> {letter.purchaserName}, GSTIN {letter.purchaserGstin}
        <br />
        {letter.purchaserAddress}
      </p>
      <p className="mt-2 text-sm text-black">
        <strong>Supplier:</strong> {letter.supplierName}, GSTIN {letter.supplierGstin}
      </p>
      <p className="mt-2 text-sm text-black">
        <strong>Reason:</strong> {letter.reasonLabel}
      </p>
      <table className="mt-4 w-full border-collapse text-xs text-black">
        <thead>
          <tr>
            <th className="border border-black px-2 py-1">Credit note</th>
            <th className="border border-black px-2 py-1">Date</th>
            <th className="border border-black px-2 py-1">Original invoice</th>
            <th className="border border-black px-2 py-1">Invoice date</th>
            <th className="border border-black px-2 py-1">Taxable</th>
            <th className="border border-black px-2 py-1">CGST</th>
            <th className="border border-black px-2 py-1">SGST</th>
            <th className="border border-black px-2 py-1">IGST</th>
            <th className="border border-black px-2 py-1">Cess</th>
          </tr>
        </thead>
        <tbody>
          {letter.rows.map((row) => (
            <tr key={row.creditNoteNumber}>
              <td className="border border-black px-2 py-1">{row.creditNoteNumber}</td>
              <td className="border border-black px-2 py-1">{row.creditNoteDate}</td>
              <td className="border border-black px-2 py-1">{row.originalInvoiceNumber}</td>
              <td className="border border-black px-2 py-1">{row.originalInvoiceDate}</td>
              <td className="border border-black px-2 py-1">{formatPrice(row.taxableValue)}</td>
              <td className="border border-black px-2 py-1">{formatPrice(row.cgst)}</td>
              <td className="border border-black px-2 py-1">{formatPrice(row.sgst)}</td>
              <td className="border border-black px-2 py-1">{formatPrice(row.igst)}</td>
              <td className="border border-black px-2 py-1">{formatPrice(row.cess)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-4 text-sm text-black">{letter.statement}</p>
      <div className="mt-16 grid grid-cols-2 gap-8 text-sm text-black">
        <p>
          Date: ______________
          <br />
          Place: ______________
        </p>
        <p className="text-right">
          Authorised signatory
          <br />
          <br />
          ____________________________
        </p>
      </div>
    </article>
  );
}
