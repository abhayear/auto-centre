# Purchaser GST Credit-Note ITC Assistant Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a purchaser-side Indian GST credit-note ITC decision wizard (public) with a printable self-declaration, plus a staff-only saved register of those cases.

**Architecture:** One pure engine in `src/lib/credit-note-itc.ts` runs in the browser for the public wizard and again on the server when staff save, so stored decisions cannot drift. Postgres `CreditNoteItcCase` is staff-only. Print is `window.print()` with `print:hidden` chrome. No 2B/IMS upload.

**Tech Stack:** Next.js 16 App Router, Prisma/PostgreSQL, NextAuth ops portal, Zod, Vitest, existing `Button`/`Input`/`Select`/`Modal`.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-09-11-credit-note-itc-purchaser-design.md`
- Purchaser assistant only — do not issue customer credit notes or clone RebateLedger
- No GSTR-2B / Excel / IMS matching (GST ITC Matcher stays a separate Streamlit link)
- No new chart or PDF libraries; browser print / Save as PDF
- Wrap new App Router API handlers with `observeRoute`
- Public wizard: no login, no database writes
- Staff save: `requireOpsPortal`; DELETE: `requireAdminRole`
- Windows PowerShell: `;` not `&&`; quote paths that contain `(protected)`
- Tests: Vitest (`npx vitest run src/lib/__tests__/credit-note-itc.test.ts`)
- Commit messages: imperative, like existing history (`Add …`)
- Copy disclaimer exactly from the spec Success / Disclaimer sections
- Do not give sales/mechanic this tool (ops sidebar gate is enough)

## File map

| File | Responsibility |
|------|----------------|
| `src/lib/credit-note-itc.ts` | Enums, `decideCreditNoteItc`, GSTIN check, declaration copy, serialize |
| `src/lib/__tests__/credit-note-itc.test.ts` | Decision table + declaration tests |
| `src/lib/validators.ts` | Zod save payload |
| `prisma/schema.prisma` | `CreditNoteItcCase` |
| `prisma/migrations/20260911140000_add_credit_note_itc_case/migration.sql` | Table |
| `src/app/api/credit-note-itc/route.ts` | List + create |
| `src/app/api/credit-note-itc/[id]/route.ts` | Get, patch, delete |
| `src/components/credit-note-itc/CreditNoteItcWizard.tsx` | Shared form + result |
| `src/components/credit-note-itc/CreditNoteItcDeclaration.tsx` | Print letter |
| `src/app/(public)/credit-note-itc/page.tsx` | Public page |
| `src/app/admin/(protected)/credit-note-itc/page.tsx` | Staff register |
| `src/components/layout/Footer.tsx` | Public link |
| `src/components/layout/AdminSidebar.tsx` | Staff nav |
| `src/app/sitemap.ts` | `/credit-note-itc` |

---

### Task 1: Decision engine and declaration copy

**Files:**
- Create: `src/lib/credit-note-itc.ts`
- Create: `src/lib/__tests__/credit-note-itc.test.ts`

**Interfaces:**
- Consumes: none
- Produces: enums and functions below (later tasks must use these exact names)

```ts
export const CREDIT_NOTE_KINDS = ["gst", "financial"] as const;
export const CREDIT_NOTE_REASONS = ["return", "post_sale_discount", "value_or_tax_reduced"] as const;
export const IMS_STATUSES = ["accept", "reject", "not_on_ims"] as const;
export const CREDIT_NOTE_ITC_ACTIONS = ["no_reversal", "keep_itc", "wait", "reverse_itc"] as const;
export const DECLARATION_KINDS = ["reversal", "not_availed", "rejected", "not_applicable"] as const;
export const CREDIT_NOTE_ITC_STATUSES = ["draft", "declaration_issued", "itc_reversed"] as const;

export function decideCreditNoteItc(input: Pick<CreditNoteItcInput, "itcAlreadyClaimed" | "creditNoteKind" | "imsStatus">): CreditNoteItcDecision
export function isValidGstin(value: string): boolean
export function buildCreditNoteItcDeclaration(input: CreditNoteItcInput, decision: CreditNoteItcDecision): CreditNoteItcDeclaration
export function serializeCreditNoteItcCase(record: CreditNoteItcCaseRecord): SerializedCreditNoteItcCase
export function parseIsoDate(value: string): Date
```

- [ ] **Step 1: Write the failing tests**

Create `src/lib/__tests__/credit-note-itc.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  buildCreditNoteItcDeclaration,
  decideCreditNoteItc,
  isValidGstin,
} from "@/lib/credit-note-itc";

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
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/__tests__/credit-note-itc.test.ts`

Expected: FAIL (cannot find module `@/lib/credit-note-itc` or exports missing)

- [ ] **Step 3: Write the engine**

Create `src/lib/credit-note-itc.ts`:

```ts
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
```

- [ ] **Step 4: Run tests and make sure they pass**

Run: `npx vitest run src/lib/__tests__/credit-note-itc.test.ts`

Expected: `Test Files  1 passed` and all tests passed.

- [ ] **Step 5: Commit**

```bash
git add src/lib/credit-note-itc.ts src/lib/__tests__/credit-note-itc.test.ts
git commit -m "Add purchaser credit-note ITC decision rules."
```

---

### Task 2: Prisma model and migration

**Files:**
- Modify: `prisma/schema.prisma` (after `CashBoxAuditLog`, before `ReplacementClaim`)
- Create: `prisma/migrations/20260911140000_add_credit_note_itc_case/migration.sql`

**Interfaces:**
- Consumes: none
- Produces: `prisma.creditNoteItcCase` with the fields listed in the spec

- [ ] **Step 1: Add the model to `prisma/schema.prisma`**

Insert:

```prisma
model CreditNoteItcCase {
  id                     String   @id @default(cuid())
  purchaserName          String
  purchaserGstin         String
  purchaserAddress       String
  supplierName           String
  supplierGstin          String
  originalInvoiceNumber  String
  originalInvoiceDate    DateTime @db.Date
  creditNoteNumber       String
  creditNoteDate         DateTime @db.Date
  itcAlreadyClaimed      Boolean
  creditNoteKind         String
  reason                 String
  imsStatus              String
  taxableValue           Float
  cgst                   Float    @default(0)
  sgst                   Float    @default(0)
  igst                   Float    @default(0)
  cess                   Float    @default(0)
  reversalPeriod         String?
  action                 String
  summary                String
  declarationKind        String
  status                 String   @default("draft")
  createdByEmail         String
  createdAt              DateTime @default(now())
  updatedAt              DateTime @updatedAt

  @@index([creditNoteDate])
  @@index([supplierGstin])
}
```

- [ ] **Step 2: Add the migration SQL**

Create `prisma/migrations/20260911140000_add_credit_note_itc_case/migration.sql`:

```sql
-- CreateTable
CREATE TABLE "CreditNoteItcCase" (
    "id" TEXT NOT NULL,
    "purchaserName" TEXT NOT NULL,
    "purchaserGstin" TEXT NOT NULL,
    "purchaserAddress" TEXT NOT NULL,
    "supplierName" TEXT NOT NULL,
    "supplierGstin" TEXT NOT NULL,
    "originalInvoiceNumber" TEXT NOT NULL,
    "originalInvoiceDate" DATE NOT NULL,
    "creditNoteNumber" TEXT NOT NULL,
    "creditNoteDate" DATE NOT NULL,
    "itcAlreadyClaimed" BOOLEAN NOT NULL,
    "creditNoteKind" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "imsStatus" TEXT NOT NULL,
    "taxableValue" DOUBLE PRECISION NOT NULL,
    "cgst" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "sgst" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "igst" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "cess" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "reversalPeriod" TEXT,
    "action" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "declarationKind" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "createdByEmail" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CreditNoteItcCase_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CreditNoteItcCase_creditNoteDate_idx" ON "CreditNoteItcCase"("creditNoteDate");

-- CreateIndex
CREATE INDEX "CreditNoteItcCase_supplierGstin_idx" ON "CreditNoteItcCase"("supplierGstin");
```

- [ ] **Step 3: Generate the Prisma client**

Run: `npx prisma generate`

Expected: client generated. If Windows `EPERM` on `query_engine-windows.dll.node`, retry with the dev server stopped; types in `index.d.ts` must include `CreditNoteItcCase`. Production applies the migration via `build:prod`.

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/20260911140000_add_credit_note_itc_case
git commit -m "Add credit-note ITC case table for purchaser register."
```

---

### Task 3: Zod save schema

**Files:**
- Modify: `src/lib/validators.ts` (imports at top + new schema after `cashBoxRecordUpdateSchema`)

**Interfaces:**
- Consumes: enums from `src/lib/credit-note-itc.ts`
- Produces: `creditNoteItcCaseSchema`, `creditNoteItcCaseUpdateSchema`

- [ ] **Step 1: Add imports**

In `src/lib/validators.ts` add:

```ts
import {
  CREDIT_NOTE_ITC_STATUSES,
  CREDIT_NOTE_KINDS,
  CREDIT_NOTE_REASONS,
  IMS_STATUSES,
} from "@/lib/credit-note-itc";
```

- [ ] **Step 2: Add schemas after `cashBoxRecordUpdateSchema`**

```ts
const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD date");

export const creditNoteItcCaseSchema = z.object({
  purchaserName: z.string().trim().min(2),
  purchaserGstin: z.string().trim().min(1),
  purchaserAddress: z.string().trim().min(2),
  supplierName: z.string().trim().min(2),
  supplierGstin: z.string().trim().min(1),
  originalInvoiceNumber: z.string().trim().min(1),
  originalInvoiceDate: isoDateSchema,
  creditNoteNumber: z.string().trim().min(1),
  creditNoteDate: isoDateSchema,
  itcAlreadyClaimed: z.boolean(),
  creditNoteKind: z.enum(CREDIT_NOTE_KINDS),
  reason: z.enum(CREDIT_NOTE_REASONS),
  imsStatus: z.enum(IMS_STATUSES),
  taxableValue: z.coerce.number().min(0),
  cgst: z.coerce.number().min(0).default(0),
  sgst: z.coerce.number().min(0).default(0),
  igst: z.coerce.number().min(0).default(0),
  cess: z.coerce.number().min(0).default(0),
  reversalPeriod: z.string().trim().max(20).optional().nullable(),
  status: z.enum(CREDIT_NOTE_ITC_STATUSES).optional(),
});

export const creditNoteItcCaseUpdateSchema = creditNoteItcCaseSchema.partial();
```

Do not require a valid GSTIN pattern here (spec: warn in the UI, still allow save/print).

- [ ] **Step 3: Commit**

```bash
git add src/lib/validators.ts
git commit -m "Validate staff credit-note ITC case payloads."
```

---

### Task 4: Staff API

**Files:**
- Create: `src/app/api/credit-note-itc/route.ts`
- Create: `src/app/api/credit-note-itc/[id]/route.ts`

**Interfaces:**
- Consumes: `decideCreditNoteItc`, `parseIsoDate`, `serializeCreditNoteItcCase`, `creditNoteItcCaseSchema`, `requireOpsPortal`, `requireAdminRole`, `observeRoute`
- Produces: `GET/POST /api/credit-note-itc`, `GET/PATCH/DELETE /api/credit-note-itc/[id]`
- On create/update, recompute `action`, `summary`, `declarationKind` from `decideCreditNoteItc` — never trust client-sent decision fields

- [ ] **Step 1: Create list/create route**

`src/app/api/credit-note-itc/route.ts`:

```ts
import { observeRoute } from "@/lib/health/observe-route";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireOpsPortal } from "@/lib/auth";
import {
  decideCreditNoteItc,
  parseIsoDate,
  serializeCreditNoteItcCase,
} from "@/lib/credit-note-itc";
import { prisma } from "@/lib/prisma";
import { creditNoteItcCaseSchema, formatZodErrors } from "@/lib/validators";

async function getHandler() {
  const session = await requireOpsPortal();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const records = await prisma.creditNoteItcCase.findMany({
    orderBy: [{ creditNoteDate: "desc" }, { createdAt: "desc" }],
    take: 200,
  });
  return NextResponse.json(records.map(serializeCreditNoteItcCase));
}

async function postHandler(request: NextRequest) {
  const session = await requireOpsPortal();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const data = creditNoteItcCaseSchema.parse(await request.json());
    const decision = decideCreditNoteItc(data);
    const record = await prisma.creditNoteItcCase.create({
      data: {
        purchaserName: data.purchaserName,
        purchaserGstin: data.purchaserGstin,
        purchaserAddress: data.purchaserAddress,
        supplierName: data.supplierName,
        supplierGstin: data.supplierGstin,
        originalInvoiceNumber: data.originalInvoiceNumber,
        originalInvoiceDate: parseIsoDate(data.originalInvoiceDate),
        creditNoteNumber: data.creditNoteNumber,
        creditNoteDate: parseIsoDate(data.creditNoteDate),
        itcAlreadyClaimed: data.itcAlreadyClaimed,
        creditNoteKind: data.creditNoteKind,
        reason: data.reason,
        imsStatus: data.imsStatus,
        taxableValue: data.taxableValue,
        cgst: data.cgst,
        sgst: data.sgst,
        igst: data.igst,
        cess: data.cess,
        reversalPeriod: data.reversalPeriod?.trim() || null,
        action: decision.action,
        summary: decision.summary,
        declarationKind: decision.declarationKind,
        status: data.status ?? "draft",
        createdByEmail: session.user.email ?? "unknown",
      },
    });
    return NextResponse.json(serializeCreditNoteItcCase(record), { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: formatZodErrors(error) },
        { status: 400 },
      );
    }
    return NextResponse.json({ error: "Failed to save credit note case" }, { status: 500 });
  }
}

export const GET = observeRoute(getHandler);
export const POST = observeRoute(postHandler);
```

- [ ] **Step 2: Create id route**

`src/app/api/credit-note-itc/[id]/route.ts`:

```ts
import { observeRoute } from "@/lib/health/observe-route";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminRole, requireOpsPortal } from "@/lib/auth";
import {
  decideCreditNoteItc,
  parseIsoDate,
  serializeCreditNoteItcCase,
  type CreditNoteKind,
  type ImsStatus,
} from "@/lib/credit-note-itc";
import { prisma } from "@/lib/prisma";
import { creditNoteItcCaseUpdateSchema, formatZodErrors } from "@/lib/validators";

type RouteParams = { params: Promise<{ id: string }> };

async function getHandler(_request: NextRequest, { params }: RouteParams) {
  const session = await requireOpsPortal();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const record = await prisma.creditNoteItcCase.findUnique({ where: { id } });
  if (!record) {
    return NextResponse.json({ error: "Record not found" }, { status: 404 });
  }
  return NextResponse.json(serializeCreditNoteItcCase(record));
}

async function patchHandler(request: NextRequest, { params }: RouteParams) {
  const session = await requireOpsPortal();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;

  try {
    const existing = await prisma.creditNoteItcCase.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Record not found" }, { status: 404 });
    }

    const data = creditNoteItcCaseUpdateSchema.parse(await request.json());
    const merged = {
      itcAlreadyClaimed: data.itcAlreadyClaimed ?? existing.itcAlreadyClaimed,
      creditNoteKind: (data.creditNoteKind ?? existing.creditNoteKind) as CreditNoteKind,
      imsStatus: (data.imsStatus ?? existing.imsStatus) as ImsStatus,
    };
    const decision = decideCreditNoteItc(merged);

    const record = await prisma.creditNoteItcCase.update({
      where: { id },
      data: {
        ...(data.purchaserName !== undefined ? { purchaserName: data.purchaserName } : {}),
        ...(data.purchaserGstin !== undefined ? { purchaserGstin: data.purchaserGstin } : {}),
        ...(data.purchaserAddress !== undefined ? { purchaserAddress: data.purchaserAddress } : {}),
        ...(data.supplierName !== undefined ? { supplierName: data.supplierName } : {}),
        ...(data.supplierGstin !== undefined ? { supplierGstin: data.supplierGstin } : {}),
        ...(data.originalInvoiceNumber !== undefined
          ? { originalInvoiceNumber: data.originalInvoiceNumber }
          : {}),
        ...(data.originalInvoiceDate
          ? { originalInvoiceDate: parseIsoDate(data.originalInvoiceDate) }
          : {}),
        ...(data.creditNoteNumber !== undefined ? { creditNoteNumber: data.creditNoteNumber } : {}),
        ...(data.creditNoteDate ? { creditNoteDate: parseIsoDate(data.creditNoteDate) } : {}),
        ...(data.itcAlreadyClaimed !== undefined ? { itcAlreadyClaimed: data.itcAlreadyClaimed } : {}),
        ...(data.creditNoteKind !== undefined ? { creditNoteKind: data.creditNoteKind } : {}),
        ...(data.reason !== undefined ? { reason: data.reason } : {}),
        ...(data.imsStatus !== undefined ? { imsStatus: data.imsStatus } : {}),
        ...(data.taxableValue !== undefined ? { taxableValue: data.taxableValue } : {}),
        ...(data.cgst !== undefined ? { cgst: data.cgst } : {}),
        ...(data.sgst !== undefined ? { sgst: data.sgst } : {}),
        ...(data.igst !== undefined ? { igst: data.igst } : {}),
        ...(data.cess !== undefined ? { cess: data.cess } : {}),
        ...(data.reversalPeriod !== undefined
          ? { reversalPeriod: data.reversalPeriod?.trim() || null }
          : {}),
        ...(data.status !== undefined ? { status: data.status } : {}),
        action: decision.action,
        summary: decision.summary,
        declarationKind: decision.declarationKind,
      },
    });
    return NextResponse.json(serializeCreditNoteItcCase(record));
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: formatZodErrors(error) },
        { status: 400 },
      );
    }
    return NextResponse.json({ error: "Failed to update credit note case" }, { status: 500 });
  }
}

async function deleteHandler(_request: NextRequest, { params }: RouteParams) {
  const session = await requireAdminRole();
  if (!session) {
    return NextResponse.json({ error: "Only admins can delete credit note cases" }, { status: 403 });
  }
  const { id } = await params;
  try {
    await prisma.creditNoteItcCase.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete record" }, { status: 500 });
  }
}

export const GET = observeRoute(getHandler);
export const PATCH = observeRoute(patchHandler);
export const DELETE = observeRoute(deleteHandler);
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/credit-note-itc
git commit -m "Add staff API for purchaser credit-note ITC cases."
```

---

### Task 5: Wizard and print letter

**Files:**
- Create: `src/components/credit-note-itc/CreditNoteItcDeclaration.tsx`
- Create: `src/components/credit-note-itc/CreditNoteItcWizard.tsx`

**Interfaces:**
- Consumes: `decideCreditNoteItc`, `buildCreditNoteItcDeclaration`, `isValidGstin`, `CREDIT_NOTE_ITC_DISCLAIMER`, `CreditNoteItcInput`
- Produces: `CreditNoteItcWizard` with `mode: "public" | "staff"`, optional `initial`, `onSave(payload)`, `saving`

Print fields required before `window.print()`: invoice number/date, CN number/date, purchaser name/GSTIN/address, supplier name/GSTIN. Toast if missing.

GST CN must have `cgst+sgst+igst+cess > 0` before showing a decision. Financial CN may have tax heads at 0.

- [ ] **Step 1: Create the declaration letter**

`src/components/credit-note-itc/CreditNoteItcDeclaration.tsx`:

```tsx
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
```

- [ ] **Step 2: Create the wizard**

Create `src/components/credit-note-itc/CreditNoteItcWizard.tsx` exactly:

```tsx
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
  type CreditNoteItcInput,
  type CreditNoteKind,
  type CreditNoteReason,
  type ImsStatus,
} from "@/lib/credit-note-itc";

export type CreditNoteItcFormValue = CreditNoteItcInput;

const empty = (overrides?: Partial<CreditNoteItcFormValue>): CreditNoteItcFormValue => ({
  itcAlreadyClaimed: true,
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
});

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
  const ready = value.creditNoteKind === "financial" || taxSum > 0;
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
          id="itcAlreadyClaimed"
          label="Already claimed ITC on the original invoice in a filed GSTR-3B?"
          value={value.itcAlreadyClaimed ? "yes" : "no"}
          onChange={(e) => patch({ itcAlreadyClaimed: e.target.value === "yes" })}
          options={[
            { value: "yes", label: "Yes" },
            { value: "no", label: "No" },
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
          label="IMS"
          value={value.imsStatus}
          onChange={(e) => patch({ imsStatus: e.target.value as ImsStatus })}
          options={[
            { value: "accept", label: "Accept" },
            { value: "reject", label: "Reject" },
            { value: "not_on_ims", label: "Not on IMS yet" },
          ]}
        />
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
            <p className="mt-1 text-sm text-slate-300">GSTR-3B {decision.gstr3bTable}</p>
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
          <Button type="button" loading={saving} onClick={() => onSave(value)}>
            Save
          </Button>
        ) : null}
      </div>

      {letter ? <CreditNoteItcDeclaration letter={letter} /> : null}
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/credit-note-itc
git commit -m "Add credit-note ITC wizard and printable declaration."
```

---

### Task 6: Public page, footer, sitemap

**Files:**
- Create: `src/app/(public)/credit-note-itc/page.tsx`
- Modify: `src/components/layout/Footer.tsx` — add Quick Link after Service Schedule
- Modify: `src/app/sitemap.ts` — add `{ path: "/credit-note-itc", changeFrequency: "monthly", priority: 0.5 }`

**Interfaces:**
- Consumes: `CreditNoteItcWizard` `mode="public"`
- Produces: public URL `/credit-note-itc`

- [ ] **Step 1: Public page**

```tsx
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
```

- [ ] **Step 2: Footer link**

After the Service Schedule `<li>` in `src/components/layout/Footer.tsx`:

```tsx
<li>
  <Link href="/credit-note-itc" className="hover:text-red-400">
    Credit note ITC
  </Link>
</li>
```

- [ ] **Step 3: Sitemap entry**

In `STATIC_PATHS` in `src/app/sitemap.ts`, after `/service-schedule`:

```ts
{ path: "/credit-note-itc", changeFrequency: "monthly" as const, priority: 0.5 },
```

- [ ] **Step 4: Commit**

```bash
git add "src/app/(public)/credit-note-itc/page.tsx" src/components/layout/Footer.tsx src/app/sitemap.ts
git commit -m "Publish the purchaser credit-note ITC wizard."
```

---

### Task 7: Staff register and sidebar

**Files:**
- Create: `src/app/admin/(protected)/credit-note-itc/page.tsx`
- Modify: `src/components/layout/AdminSidebar.tsx`

**Interfaces:**
- Consumes: `/api/credit-note-itc`, `CreditNoteItcWizard` `mode="staff"`, `isAdminRole`, `SITE_NAME`, `SITE_ADDRESS`
- Produces: `/admin/credit-note-itc` table + add/edit modal + status + print + admin delete

- [ ] **Step 1: Sidebar item**

In `src/components/layout/AdminSidebar.tsx`, add `FileText` to the lucide-react import. After the GST ITC Matcher nav item insert:

```ts
{ href: "/admin/credit-note-itc", label: "Credit note ITC", icon: FileText, show: canUseOpsPortal },
```

Do not change `portal-pages.ts` (ops catch-all already covers this path).

- [ ] **Step 2: Staff page**

Create `src/app/admin/(protected)/credit-note-itc/page.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import toast from "react-hot-toast";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { CreditNoteItcWizard, type CreditNoteItcFormValue } from "@/components/credit-note-itc/CreditNoteItcWizard";
import { isAdminRole } from "@/lib/admin-roles";
import {
  CREDIT_NOTE_ITC_STATUSES,
  type CreditNoteItcStatus,
  type SerializedCreditNoteItcCase,
} from "@/lib/credit-note-itc";
import { SITE_ADDRESS, SITE_NAME } from "@/lib/constants";
import { formatRecordDate } from "@/lib/cash-box";

const STATUS_OPTIONS = CREDIT_NOTE_ITC_STATUSES.map((value) => ({
  value,
  label: value.replaceAll("_", " "),
}));

export default function AdminCreditNoteItcPage() {
  const { data: session } = useSession();
  const canDelete = isAdminRole(session?.user?.role ?? "");
  const [records, setRecords] = useState<SerializedCreditNoteItcCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<SerializedCreditNoteItcCase | undefined>();

  async function refresh() {
    const res = await fetch("/api/credit-note-itc");
    setRecords(await res.json());
  }

  useEffect(() => {
    let active = true;
    fetch("/api/credit-note-itc")
      .then((res) => res.json())
      .then((data) => {
        if (active) {
          setRecords(data);
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, []);

  async function handleSave(payload: CreditNoteItcFormValue) {
    setSaving(true);
    try {
      const res = await fetch(editing ? `/api/credit-note-itc/${editing.id}` : "/api/credit-note-itc", {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await res.json();
      if (!res.ok) {
        toast.error(result.error ?? "Failed to save");
        return;
      }
      toast.success(editing ? "Case updated" : "Case saved");
      setShowForm(false);
      setEditing(undefined);
      await refresh();
    } finally {
      setSaving(false);
    }
  }

  async function handleStatus(id: string, status: CreditNoteItcStatus) {
    const res = await fetch(`/api/credit-note-itc/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) {
      toast.error("Failed to update status");
      return;
    }
    await refresh();
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this credit note case?")) return;
    const res = await fetch(`/api/credit-note-itc/${id}`, { method: "DELETE" });
    if (!res.ok) {
      toast.error("Failed to delete");
      return;
    }
    toast.success("Deleted");
    await refresh();
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-red-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Credit note ITC (purchaser)</h1>
          <p className="mt-1 text-sm text-slate-400">
            Cases you received as purchaser — decision, declaration, and 3B reversal status.
          </p>
        </div>
        <Button
          onClick={() => {
            setEditing(undefined);
            setShowForm(true);
          }}
        >
          <Plus className="h-4 w-4" />
          Add credit note
        </Button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-700/50">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-700 bg-slate-800/50">
            <tr>
              <th className="px-4 py-3 font-medium text-slate-300">CN date</th>
              <th className="px-4 py-3 font-medium text-slate-300">Supplier</th>
              <th className="px-4 py-3 font-medium text-slate-300">CN no.</th>
              <th className="px-4 py-3 font-medium text-slate-300">Decision</th>
              <th className="px-4 py-3 font-medium text-slate-300">Status</th>
              <th className="px-4 py-3 font-medium text-slate-300">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700/50">
            {records.map((record) => (
              <tr key={record.id} className="hover:bg-slate-800/30">
                <td className="px-4 py-3 text-white">{formatRecordDate(record.creditNoteDate)}</td>
                <td className="px-4 py-3 text-slate-300">{record.supplierName}</td>
                <td className="px-4 py-3 text-slate-300">{record.creditNoteNumber}</td>
                <td className="px-4 py-3 text-slate-300">{record.action.replaceAll("_", " ")}</td>
                <td className="px-4 py-3">
                  <Select
                    id={`status-${record.id}`}
                    value={record.status}
                    onChange={(e) => void handleStatus(record.id, e.target.value as CreditNoteItcStatus)}
                    options={STATUS_OPTIONS}
                  />
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      title="Edit / print"
                      onClick={() => {
                        setEditing(record);
                        setShowForm(true);
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    {canDelete ? (
                      <Button variant="ghost" size="sm" title="Delete" onClick={() => handleDelete(record.id)}>
                        <Trash2 className="h-4 w-4 text-red-400" />
                      </Button>
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {records.length === 0 ? (
          <p className="py-8 text-center text-slate-400">
            Add the first credit note you received as purchaser
          </p>
        ) : null}
      </div>

      {showForm ? (
        <Modal
          open
          size="lg"
          title={editing ? "Edit credit note" : "Add credit note"}
          onClose={() => {
            setShowForm(false);
            setEditing(undefined);
          }}
        >
          <CreditNoteItcWizard
            key={editing?.id ?? "new"}
            mode="staff"
            saving={saving}
            initial={
              editing
                ? {
                    ...editing,
                    reversalPeriod: editing.reversalPeriod ?? "",
                    reason: editing.reason as CreditNoteItcFormValue["reason"],
                    creditNoteKind: editing.creditNoteKind as CreditNoteItcFormValue["creditNoteKind"],
                    imsStatus: editing.imsStatus as CreditNoteItcFormValue["imsStatus"],
                  }
                : { purchaserName: SITE_NAME, purchaserAddress: SITE_ADDRESS }
            }
            onSave={handleSave}
          />
        </Modal>
      ) : null}
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add "src/app/admin/(protected)/credit-note-itc/page.tsx" src/components/layout/AdminSidebar.tsx
git commit -m "Add staff register for purchaser credit-note ITC cases."
```

---

### Task 8: Verify

**Files:** none new

- [ ] **Step 1: Unit tests**

Run: `npx vitest run src/lib/__tests__/credit-note-itc.test.ts`

Expected: all passing (financial, reject, wait, not claimed, reverse 4(B)(2), declaration contents).

- [ ] **Step 2: Public flow in the browser**

Open `http://localhost:3000/credit-note-itc` (no login).

- Fill GST CN, ITC already claimed, IMS accept → result says reverse Table 4(B)(2)
- Switch to financial → no reversal
- Footer Quick Links includes Credit note ITC
- Print is blocked with the toast until invoice/CN/GSTIN filled; then print dialog shows the letter without the amber disclaimer

- [ ] **Step 3: Staff flow**

Open `/admin/credit-note-itc` as admin.

- Save a case; it appears in the table
- Change status to `declaration issued`
- Manager can save; manager delete returns 403
- Admin can delete

If local Docker/Postgres is down, API save will fail; unit tests and public wizard still prove the engine. Do not claim staff save works without a successful POST.

---

## Self-review (spec coverage)

| Spec requirement | Task |
|---|---|
| Public `/credit-note-itc` | 6 |
| Staff `/admin/credit-note-itc` | 7 |
| Shared engine | 1 |
| Decision table (5 rows) | 1 tests |
| Printable declaration | 5 |
| Disclaimer copy | 1 + 5 |
| Staff register fields/status | 2, 4, 7 |
| Ops save, admin delete | 4, 7 |
| Footer + sidebar | 6, 7 |
| No 2B upload | not built |
| GSTIN warn not block | 3, 5 |
| Recompute decision on save | 4 |
| Tests | 1, 8 |
| Sitemap | 6 |
| No separate print route | 5 (`window.print`) |
