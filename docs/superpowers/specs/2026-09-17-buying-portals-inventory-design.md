# Buying portals, store inventory, and rate lock

Date: 2026-09-17  
Status: design approved in conversation; waiting for spec review before the implementation plan  
Site: Auto Galaxy staff portal (`/admin`)  
Code: same GitHub repo as today (`abhayear/auto-centre`)

## Goal

Let Auto Galaxy buy spare parts from vendor websites, keep warehouse qty honest, and stop purchasing/store staff from changing **purchase rate** or **selling price**. Admin and the existing **manager** role add portals and own prices. Two new logins do the warehouse work.

This is **not** Replacement Parts (customer warranty claims and `ReplacementStockItem`). Buying stock is a separate warehouse.

## Approach

**Vendor hub + one connector per site.** Manager/Admin save portal name, URL, and login. Sync runs only when a named connector exists for that site. Until then, Purchasing confirms qty with **manual receive**. No generic “scrape any URL” robot.

## Roles

`AdminUser.role` gains `purchasing` and `store`. Sign-in stays `/` and `/admin/login`; the role picker lists all eight roles. Same mismatch rule as today if the picker does not match the stored role.

| Role | Inventory | Rates | Portal logins |
|------|-----------|-------|----------------|
| `admin` | All four inventory pages + existing ops | May set purchase (logged if not from sync) and selling | Add / edit / sync |
| `manager` | All four inventory pages + existing ops | Same as admin | Add / edit / sync |
| `purchasing` | **Receive** only (plus change-password) | Read on receive/audit context; **cannot write** | Cannot see passwords or add portals |
| `store` | **Issue & count** and **Audit** | Read on audit; **cannot write** | No |
| `sales`, `mechanic`, developers | No inventory pages in v1 | No | No |

`canUseOpsPortal` stays admin + manager only. Purchasing and Store are **not** full ops users. Page guard sends them to `/admin/inventory/receive` or `/admin/inventory/issue` as home. APIs reject rate fields and portal-credential writes for those roles even if the client is tampered.

Cash box, staff, vehicles, and training stay as they are today. No new training audiences in v1.

## Seed portals

Manager can add more. v1 seeds these rows (no passwords until Manager saves them):

- Elyf EV Spare  
- Vishal Bearing House  
- Maple  
- Komaki  
- E Indiabull  
- R K Enterprises  

## Data

Single warehouse. New tables only (do not reuse replacement-parts models).

**BuyingPortal**  
id, name, websiteUrl, username, passwordEncrypted, enabled, connectorId (nullable string, e.g. `elyf`), lastSyncedAt, lastError, createdByEmail, timestamps.

**InventoryPart**  
id, code (unique), name, onHandQty (int), purchaseRate (decimal), sellingPrice (decimal), timestamps.

**PortalCatalogLine**  
id, portalId, vendorSku, vendorName, livePurchaseRate, inventoryPartId (nullable), lastSyncedAt. Purchasing links a vendor line to a part on Receive. Linking does not change selling price.

**PurchaseBill**  
id, portalId, billNumber, billDate, source `synced` | `manual`, status `draft` | `received` | `blocked_duplicate`, confirmedByEmail, timestamps. Unique on `(portalId, billNumber)`.

**PurchaseBillLine**  
id, billId, inventoryPartId, qty, purchaseRateSnapshot (copied from catalog or current part rate at confirm; **not** a form field for purchasing).

**StockMovement**  
id, partId, kind `receive` | `issue` | `job_use` | `spare_sale` | `count`, qtyDelta (signed), qtyAfter, billId nullable, jobRef nullable, note nullable, actorEmail, createdAt. Append-only.

**StockCount**  
id, partId, physicalQty, systemQty, actorEmail, createdAt. Writes a `count` movement so on-hand becomes physicalQty.

**RateChangeLog**  
id, partId, field `purchaseRate` | `sellingPrice`, oldValue, newValue, source `portal_sync` | `manager_override`, actorEmail, createdAt.

There is no job-card parts module today. **job_use** and **spare_sale** are movement kinds Store (or admin/manager) records on Issue & count, with optional job number. That is the v1 meaning of “job card / spare sale also deducts.” Wiring those kinds into a future job-card UI is out of this spec.

## Rate lock

- `purchasing` and `store` PATCH/POST bodies that include `purchaseRate` or `sellingPrice` return 403. Receive form has no rate inputs.  
- Portal catalog sync may update `purchaseRate` and write `RateChangeLog` with source `portal_sync`. It never updates `sellingPrice`.  
- Admin/manager set selling price on the part. They set purchase rate only when there is no connector or last sync failed; that writes `manager_override`.  
- Bill line `purchaseRateSnapshot` is stored for audit; editing a bill after receive is not allowed.

## Sync

- Cron plus **Sync now** on Portals (admin/manager).  
- Connector interface: `login`, `fetchBills`, `fetchCatalog`. Each website is its own module. Unknown `connectorId` → skip fetch, set lastError to “No connector; use manual receive.”  
- Synced bills land as `draft`. Purchasing **Confirm** creates receive movements and increases `onHandQty`. Qty is never applied from HTML alone.  
- OTP, captcha, or HTML change: lastError set; qty and rates unchanged; Purchasing uses manual receive (portal, bill no, date, part, qty). Manual receive still copies rate from the part (or catalog if linked); Purchasing cannot type the rate.  
- Duplicate portal + bill number: second confirm `blocked_duplicate`.  
- Passwords never returned to purchasing/store APIs. Admin/manager get `passwordSaved: true`, never the plaintext, after save.

v1 ships the hub, encryption, job stub, and **zero or one** live connector if a site can be logged in without OTP during implementation. The other seed portals stay manual until their connector is added. That is expected, not a defect.

## Screens

All under `/admin/inventory`.

1. **Portals** (`/admin/inventory/portals`) — admin/manager. List, add (name, URL, username, password), enable, connector id when we have one, Sync now, last error.  
2. **Receive** (`/admin/inventory/receive`) — purchasing, admin, manager. Draft synced bills + Confirm. Manual receive form. Link vendor SKU to part on the same page. Purchasing may add a part as **code + name only** (qty 0, both rates 0) so they can receive it; they still cannot set rates.  
3. **Issue & count** (`/admin/inventory/issue`) — store, admin, manager. Kind: issue, job use, spare sale, or count. Part, qty, optional job no.  
4. **Audit** (`/admin/inventory/audit`) — store, admin, manager. Filter part or date. List movements. Rates as text.

Admin/manager also create/edit **InventoryPart** (code, name, selling price, purchase override) on a short list on Portals or a single **Parts** block on the same Portals page — not a fifth concept. Prefer a **Parts** section at the bottom of Portals so there are still four routes.

## Stock math

- Confirm receive / manual receive: `onHandQty += qty`, movement `receive`.  
- Issue, job_use, spare_sale: `onHandQty -= qty`, movement of that kind. Allowed even if qty goes below zero so workshop work is not blocked; audit shows negative on-hand.  
- Count: set `onHandQty` to physical qty; movement `count` with delta.  
- Audit is that movement list. No separate report engine.

## Tests

- `purchasing` / `store` cannot write rates or portal passwords.  
- Manager can add a portal.  
- Confirm receive increases qty; duplicate bill number is rejected.  
- Issue, job_use, and spare_sale decrease qty.  
- Count sets on-hand to physical qty.  
- Failed sync does not change qty or rates.  
- Catalog sync does not change selling price.

## Out of scope

WhatsApp, email ingest, multi-godown, generic Playwright-any-URL, training for these roles, GST purchase invoice filing, changing Replacement Parts, public website.

## Success

A store person can see what came in from Elyf / Vishal / Maple / Komaki / E Indiabull / R K Enterprises (synced or typed qty) and what went out, and cannot change a rate. Manager can add the next portal without a code change; that portal stays manual until a connector exists.
