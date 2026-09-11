# Purchaser GST credit-note ITC assistant

Date: 2026-09-11  
Status: design approved in conversation; waiting for spec review before the implementation plan  
Site: Auto Galaxy (`https://autogalaxy.in`)  
Code: same GitHub repo (`abhayear/auto-centre`)

## Goal

Give the **purchaser** (the registered buyer who received a supplier GST credit note) a decision assistant for Indian ITC:

- What to do: reverse ITC, do not reverse, reject on IMS, or wait.
- Where: GSTR-3B table and period when reversal applies.
- A **printable self-declaration** the supplier can file as evidence of reversal (or that ITC was never claimed).

This is **not** RebateLedger (issuer / scheme settlement / rebate accrual). Auto Galaxy uses it as purchaser. Anyone can use the public wizard. Staff can save cases in a simple register.

It is **guidance, not a tax opinion**. CA/CMA certificates are out of scope (Circular 253/10/2025-GST withdrew that as a mandatory proof).

## Out of scope (v1)

- GSTR-2B / Excel / IMS file upload or matching (existing GST ITC Matcher stays separate)
- Auto-accept/reject on the GST portal
- Issuing credit notes to Auto Galaxy customers
- Rebate, scheme, or trade-spend accruals
- Hash-chained audit log (created/updated timestamps are enough)

## Approach

One pure decision engine in the Next.js app. Public wizard and staff register share it. Saving to Postgres is staff-only (`requireOpsPortal`). Print is the browser print dialog (Save as PDF), same pattern as `/service-schedule`.

## Surfaces

| Surface | URL | Auth |
|---------|-----|------|
| Public wizard | `/credit-note-itc` | None |
| Staff register | `/admin/credit-note-itc` | Ops portal (admin, manager) |
| Staff print | Same declaration component + `window.print()` (no separate print route in v1) | Ops portal |
| Decision API | none for the public wizard — run the engine in the client (and again on the server when staff save, so stored `decision` cannot drift) | |
| Register API | `/api/credit-note-itc` GET/POST, `/api/credit-note-itc/[id]` GET/PATCH/DELETE | Ops; DELETE admin-only |

**Nav**

- Admin sidebar: **Credit note ITC** next to GST ITC Matcher. Internal href, not the Streamlit matcher.
- Public: shareable URL. Footer Quick Links entry **Credit note ITC** (same treatment as Service Schedule). Not on the main scooter navbar.

## Wizard inputs

All decisions use this shape (`CreditNoteItcInput`):

1. `itcAlreadyClaimed` — purchaser already claimed ITC on the original invoice in a **filed** GSTR-3B (`yes` / `no`).
2. `creditNoteKind` — `gst` (tax credit note with CGST/SGST or IGST) or `financial` (commercial credit, no GST).
3. `reason` — `return` | `post_sale_discount` | `value_or_tax_reduced`.
4. `imsStatus` — `accept` | `reject` | `not_on_ims`.
5. Amounts: `taxableValue`, `cgst`, `sgst`, `igst`, `cess` (numbers ≥ 0). GST credit notes must have tax on at least one head; financial notes may be taxable-only.
6. Document refs (required to print; not required to preview a decision): original invoice number/date, credit-note number/date.
7. Parties (required to print): purchaser legal name, GSTIN, address; supplier legal name, GSTIN.

GSTIN format: 15-character Indian GSTIN pattern. Invalid format shows a warning; print is still allowed.

Staff “Add” pre-fills purchaser name and address from `SITE_NAME` and `SITE_ADDRESS`. GSTIN is typed (the app has no stored GSTIN today).

## Decision table

Pure function `decideCreditNoteItc(input) → CreditNoteItcDecision`.

`action`:

| Condition (first match wins) | `action` | `gstr3bTable` | `gstr3bNote` |
|---|---|---|---|
| `creditNoteKind === financial` | `no_reversal` | null | No GST ITC impact. Books-only. |
| `imsStatus === reject` | `keep_itc` | null | Do not reverse. Supplier cannot reduce output tax on this CN. |
| `imsStatus === not_on_ims` | `wait` | null | Accept or reject on IMS first. If you already claimed ITC, expect to reverse after accept. |
| `itcAlreadyClaimed === no` | `no_reversal` | null | 2B nets the CN; no extra 4(B) reversal. Still accept on IMS if the CN is correct. |
| `itcAlreadyClaimed === yes` (GST CN, accept) | `reverse_itc` | `4(B)(2)` | Reverse in GSTR-3B for the tax period in which the CN appears in GSTR-2B. |

Always return:

- `action`, `gstr3bTable`, `summary` (one or two sentences in plain English)
- `reasonCode` matching the row above
- `declarationKind`: `reversal` if `reverse_itc`, `not_availed` if ITC was never claimed and the CN is GST, `rejected` if IMS reject, `not_applicable` for financial / wait

GSTR-3B period on the letter is an optional input `reversalPeriod` (e.g. `2026-09`). If `reverse_itc` and period is blank, the letter says “GSTR-3B of the period in which this credit note appears in GSTR-2B”.

## Declaration (print)

Title: **Certificate / undertaking of ITC reversal by the recipient** (purchaser).

Body includes:

- Purchaser name, GSTIN, address
- Supplier name, GSTIN
- Table: CN number, CN date, original invoice number/date, taxable value, CGST, SGST, IGST, cess
- Reason (return / post-sale discount or scheme / value or tax reduced)
- Statement matching `declarationKind`:
  - `reversal`: ITC attributable to the CN has been reversed under Section 15(3)(b)(ii) / Section 34 as applicable, in GSTR-3B Table 4(B)(2) for `[period]`.
  - `not_availed`: ITC on the original invoice was not availed; nothing remains to reverse.
  - `rejected`: credit note was / will be rejected on IMS; ITC is not being reversed.
  - `not_applicable`: financial credit note; no GST ITC reversal.
- Guidance banner (screen only, not on the printed letter): not a CA/CMA certificate; confirm with the GST return.
- Sign-off: authorised signatory, date, place. Blank signature line (purchaser signs after print).

Print: `window.print()`, `print:hidden` on site chrome / admin sidebar. No extra PDF library.

## Staff register

Prisma model `CreditNoteItcCase`:

- `id` cuid
- Purchaser and supplier fields as above
- Invoice and credit-note refs and amounts
- Wizard enums: `itcAlreadyClaimed`, `creditNoteKind`, `reason`, `imsStatus`, `reversalPeriod`
- Stored `action`, `summary`, `declarationKind` (recomputed on save/update from the engine)
- `status`: `draft` | `declaration_issued` | `itc_reversed`
- `createdByEmail`, `createdAt`, `updatedAt`

`@@index([creditNoteDate])`, `@@index([supplierGstin])`

**Permissions**

- GET list / GET one / POST / PATCH: `requireOpsPortal`
- DELETE: `requireAdminRole` (same idea as cash-box delete)
- Managers may create, edit, and change status. They cannot delete.

**Staff UI**

- Table: date, supplier, CN no., action, status
- Add / edit: same wizard as public, plus Save
- Row: print declaration, status select, delete (admin)
- Empty state: “Add the first credit note you received as purchaser”

Public users never write this table.

## UI

Public page: dark site layout (existing public layout). Heading **Credit note ITC (purchaser)**. Short subtitle: decide reversal and print a declaration. Form → result card → Print.

Staff page: admin dark table pattern (cash box / replacement parts). Modal or full-page form for add/edit.

No new chart library. No new CSS framework.

## Errors

- Decision preview: disable the result until questions 1–4 and amounts are valid.
- Save: Zod on the API; 400 with field errors; 401/403 as existing ops routes.
- Missing print fields: toast “Add invoice, credit-note, and GSTIN details to print”.
- Unique constraint: none on CN number (same supplier CN could be re-entered); staff must not treat the list as GSTR-2B.

## Tests

Vitest on the engine (`src/lib/__tests__/credit-note-itc.test.ts`):

1. Financial CN → `no_reversal` / `not_applicable`
2. IMS reject → `keep_itc` / `rejected`
3. Not on IMS → `wait`
4. GST CN, accept, ITC not claimed → `no_reversal` / `not_availed`
5. GST CN, accept, ITC already claimed → `reverse_itc`, table `4(B)(2)` / `reversal`
6. Declaration helper includes CN number and tax heads; reversal month when `reverse_itc` and period set

## Files (planned)

- `src/lib/credit-note-itc.ts` — types, `decideCreditNoteItc`, declaration copy builder, serializers
- `src/lib/__tests__/credit-note-itc.test.ts`
- `src/lib/validators.ts` — Zod for save payload
- `src/components/credit-note-itc/CreditNoteItcWizard.tsx` — shared form + result
- `src/components/credit-note-itc/CreditNoteItcDeclaration.tsx` — print letter
- `src/app/(public)/credit-note-itc/page.tsx`
- `src/app/admin/(protected)/credit-note-itc/page.tsx`
- `src/app/api/credit-note-itc/route.ts`, `src/app/api/credit-note-itc/[id]/route.ts`
- `prisma/schema.prisma` + migration
- `src/components/layout/AdminSidebar.tsx`, `src/components/layout/Footer.tsx`
- `src/lib/portal-pages.ts` — no extra gate; ops catch-all already covers `/admin/credit-note-itc`

## Success criteria

1. Public `/credit-note-itc` produces the five decision outcomes above without login.
2. Printable declaration shows purchaser/supplier GSTIN, CN table, and the matching statement.
3. Staff can save a case, reprint, and set status draft → declaration issued → ITC reversed.
4. Manager cannot delete; admin can.
5. Engine unit tests pass. No 2B upload in v1.

## Disclaimer (product copy)

“This assistant helps the purchaser decide GST ITC treatment of a supplier credit note under current Indian GST practice (including IMS accept/reject and GSTR-3B Table 4(B)(2)). It is not legal or tax advice. Confirm figures in GSTR-2B and GSTR-3B before filing.”
