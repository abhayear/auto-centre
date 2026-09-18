# Warranty, serial numbers, repair/return, and install + coding

Date: 2026-09-18  
Status: design for review; Warranty 2.0 role/task board already shipped (`/admin/warranty`)  
Site: Auto Galaxy staff portal (`/admin`)  
Code: `abhayear/auto-centre`

## Goal

Track every battery, charger, motor, and controller **by its own serial number** for its whole life, with the customer's e-bike as the parent record. A dealer must be able to type one phone number, serial, bike number, or case number and see the entire history, and must never lose the link between a faulty component and the one that replaced it.

This extends what exists. It does **not** replace it:

- `ReplacementClaim` / `ReplacementClaimItem` / `ReplacementStockItem` already hold claims, dispatch dates, challan and credit note fields, and repaired stock.
- `/admin/warranty` (Warranty 2.0) already derives each claim's stage, the role that owns the next task, and the exception list.
- What is missing is the **master data**: customers, bikes, and a serial registry with a timeline. That is what this spec adds.

## Approach

**One serial registry, append-only history.** A component row is a physical object. It is never edited to become a different object. When the company sends a different battery back, a second component row is created and linked to the first through the claim. Status changes are written as events, so the timeline is the truth and the current status is a cache of it.

## Data

### Master data (new)

**WarrantyCustomer**  
`id`, `name`, `phone` (unique), `altPhone?`, `address?`, `area?`, `distanceKm?` (Float, dealer-entered or geocoded), `latitude?`, `longitude?`, `notes?`, timestamps.

**EBike**  
`id`, `customerId` → WarrantyCustomer, `bikeNumber` (unique, e.g. `EB1025`), `chassisNumber?`, `modelName?`, `saleDate`, `invoiceNumber?`, `invoiceDate?`, `warrantyStartBasis?` (overrides the policy default), `notes?`, timestamps.  
Index on `customerId`, `bikeNumber`, `chassisNumber`.

**WarrantyComponent** — the serial registry, one row per physical component  
`id`, `serialNumber` (unique), `componentType` (`battery` | `charger` | `motor` | `controller`), `modelCode?`, `ah?`, `voltage?`,  
`origin` (`sold_with_bike` | `company_replacement` | `repaired_return` | `purchased_stock`),  
`status` (`installed` | `available` | `faulty_pending` | `with_company` | `returned_to_company` | `scrapped`),  
`currentBikeId?` → EBike, `warrantyStartDate?`, `warrantyMonths?` (null means use policy), `replacedComponentId?` (the component this one replaced), timestamps.  
Index on `serialNumber`, `componentType`, `status`, `currentBikeId`.

**ComponentEvent** — append-only timeline, never updated or deleted  
`id`, `componentId` → WarrantyComponent, `kind`, `occurredAt` (date), `bikeId?`, `claimId?`, `locationId?`, `note?`, `actorEmail`, `createdAt`.  
Kinds: `received_into_stock`, `installed`, `coding_completed`, `fault_reported`, `removed`, `sent_to_company`, `repair_started`, `repaired`, `replaced_by`, `received_from_company`, `returned_to_company`, `scrapped`.  
Index on `componentId`, `claimId`, `occurredAt`.

**CompanyLocation** — plant master, so Sirsa / Dabra / Delhi are rows, not code  
`id`, `name` (unique), `kind` (`plant` | `company` | `service_centre`), `address?`, `contactPhone?`, `active`, `createdAt`.  
Seeded with Sirsa, Dabra Plant, Delhi Plant; the manager adds more without a code change.

**WarrantyPolicy** — single row, `id = "default"`, editable by owner/admin only  
`batteryMonths` (36), `chargerMonths` (12), `motorMonths` (36), `controllerMonths` (36),  
`startBasis` (`sale_date` | `installation_date` | `invoice_date` | `company_start`),  
`expiringSoonDays` (30), `companyDelayDays` (21), `nearbyKm` (10), `escalationDays` (21),  
`updatedByEmail`, `updatedAt`.  
Changing these is owner-only authority, as in the Warranty 2.0 role matrix.

### Claim additions (extend `ReplacementClaim`, all nullable)

`customerId?`, `bikeId?`, `faultyComponentId?`, `replacementComponentId?`, `companyLocationId?`,  
`returnType?` (`repaired_same` | `replaced_other` | `new_item` | `refurbished` | `partial`),  
`expectedReturnDate?`, `installedAt?`, `codedAt?`, `codingRef?`.

**ClaimDocument** (new)  
`id`, `claimId`, `kind` (`complaint_photo` | `component_photo` | `serial_photo` | `delivery_challan` | `credit_note` | `company_bill` | `repair_document` | `courier_receipt` | `received_photo` | `coding_proof` | `other`), `url`, `uploadedByEmail`, `createdAt`.  
Uploads go to Vercel Blob, same as existing image uploads.

Existing rows keep working: `customerName` and `ReplacementClaimItem` stay populated. New claims fill both the text fields and the new links, so the letter and report printing built on `ReplacementClaimItem` does not break. Legacy claims simply have no serial timeline until someone links them.

## Warranty calculation

Never ask staff to count months.

```
start  = basis date (bike.warrantyStartBasis ?? policy.startBasis)
months = component.warrantyMonths ?? policy[componentType + "Months"]
end    = start + months   (calendar months, clamped to month length)
```

Status on a given complaint date:

- `active` — complaint date is before end
- `expiring_soon` — active and end is within `policy.expiringSoonDays`
- `expired` — complaint date is on or after end
- `unknown` — no start date or no duration recorded

Charger at 12 months and battery at 36 months on the same bike therefore expire on different dates, which is the point. Durations are policy-driven so the company raising battery cover from 3 to 5 years is a settings change, not a migration.

## Serial-number logic

Three rules decide everything:

1. **A component row is a physical object.** Its `serialNumber` is never edited to another serial. Corrections are a separate audited action with a reason.
2. **Fitment is a link, not a field rewrite.** Removing a battery sets `currentBikeId` to null and writes a `removed` event; installing writes `installed` with the bike.
3. **Replacement creates a second row.** `BAT-111` faulty and `BAT-222` returned means: `BAT-111` gets `returned_to_company`, `BAT-222` is created (or found) with `replacedComponentId = BAT-111`, `replaced_by` is written on `BAT-111`, and the claim records both ends. The chain `BAT-111 → WC-00125 → BAT-222 → EB1025` is reconstructable forever.

Current `status` and `currentBikeId` are conveniences for list screens; the event log is authoritative, so a wrong status can always be rebuilt.

## Allocation: availability compulsory, nearby preferred

Distance is a preference, never a blocker. Candidates are filtered, then tiered:

**Filter (hard):** component type matches, and if both sides record `ah` or `voltage` they must match. An exact `modelCode` match is preferred but not required.

**Tiers (in order):**

0. Warranty expiring within 3 months (existing `URGENT_WARRANTY_MONTHS`)
1. Waiting longer than `policy.escalationDays`
2. Within `policy.nearbyKm`
3. Everyone else

Inside a tier: longest waiting first, then nearest, then name. So a nearby customer is preferred over a far one, but a customer who has waited three weeks is never overtaken by a walk-in two kilometres away. If nothing compatible is free, no one is recommended and the case becomes a `replacement_unavailable` exception, which the board already raises.

## Universal search

One box at the top of the dashboard. The query is classified, then routed:

| Input looks like | Example | Routes to |
|---|---|---|
| `WC-` prefix | `WC-2026-00125` | the claim |
| 10 digits (or 91 + 10) | `9876543210` | the customer |
| Known component prefix or serial shape | `BAT-45821` | the serial timeline |
| Letters then digits, no dash | `EB1025` | the bike |
| Anything else | `Rajesh` | customer name search |

Every result opens the same place: bike → its four components → their claims → their timelines.

## Screens

Four buttons on the dashboard do the daily work; everything else is a consequence.

`+ NEW CUSTOMER` · `+ NEW BIKE` · `+ WARRANTY CLAIM` · `+ RECEIVE / INSTALL COMPONENT`

1. **Dashboard** (`/admin/warranty`) — universal search, the nine counts (total bikes, total customers, components in warranty, open claims, with company, received from company, waiting installation, completed, expiring soon), the pipeline strip, and the existing role queues and exceptions.
2. **Customers** (`/admin/warranty/customers`) — list, search, add/edit, distance in km, their bikes.
3. **Bike** (`/admin/warranty/bikes/[id]`) — customer, sale date, warranty basis, and the four component slots with serial, warranty end, and status. Registering a bike registers four serials in one form.
4. **New claim** (`/admin/warranty/claims/new`) — pick bike, pick which component, fault text, complaint date. Warranty status is computed and shown, not typed. Submitting writes `fault_reported` and creates the dispatch task.
5. **Claim** (`/admin/warranty/claims/[id]`) — one page with dispatch (plant, challan, expected return), receiving (challan, credit note, bill, return type, replacement serial), documents, and the full event trail.
6. **Receive component** (`/admin/warranty/receive`) — scan or type a serial, confirm plant and challan, status becomes `available`, then the screen immediately lists compatible waiting customers in tier order.
7. **Install + code** (`/admin/warranty/install`) — find bike by any identifier, confirm old and new serial, enter coding, one `INSTALL + CODE` button. Writes `installed` and `coding_completed`, and closes the claim if nothing else is pending.
8. **Settings** (`/admin/warranty/settings`) — owner only: component durations, start basis, day limits, nearby km, plant master.

Phone-first layout throughout: the receive and install screens must work one-handed with a camera scan, since that is where they are actually used.

## Notifications

Driven by the same thresholds, evaluated on the board and by the existing health/cron job:

claim waiting too long · component with company past `companyDelayDays` · received but not installed · customer waiting · warranty expiring in 30 days · warranty expiring in 7 days · credit note or bill missing · installed but coding not completed · claim completed.

## Authority

Reuses the shipped Warranty 2.0 matrix. Additions: registering customers, bikes, and serials is intake-and-above; `WarrantyPolicy` and `CompanyLocation` are owner-only; nobody deletes a component, a claim, or an event. Cancel, correct, and reverse require a reason and stay in the trail.

## Build order

1. Pure logic with tests: warranty dates, serial timeline, allocation tiers, search classification. **← this slice**
2. Prisma models, migration, plant and policy seed.
3. Customers, bikes, and serial registration screens, plus universal search.
4. Claim page with dispatch, receiving, return type, and documents.
5. Receive and install + coding screens, phone-first.
6. New dashboard counts and pipeline, notification rules.

## Out of scope for v1

GPS route optimisation (distance is a number the dealer enters), customer-facing login, automatic barcode label printing, multi-branch stock transfer, accounting integration, and any change to the public website.

## Success

A dealer types `9876543210` and sees Rajesh, bike EB1025, four serials with four different warranty end dates, the open claim on the battery, where it is, what came back, which serial replaced it, and who coded it — and none of that history can be overwritten.
