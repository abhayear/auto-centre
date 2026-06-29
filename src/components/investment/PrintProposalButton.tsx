"use client";

import { Download } from "lucide-react";

export function PrintProposalButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex items-center gap-2 rounded-lg border border-slate-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-slate-800"
    >
      <Download className="h-4 w-4" />
      Print / Save PDF
    </button>
  );
}
