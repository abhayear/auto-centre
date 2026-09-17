# Buying Portals Inventory Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Purchasing and Store staff logins, four Inventory pages, rate-locked warehouse qty, and a vendor-portal hub (manual receive now; named connectors later).

**Architecture:** Pure helpers for roles, rate lock, encryption, and stock math. Prisma tables for portals, parts, bills, movements. APIs under `/api/inventory/*` check role before every write. Admin UI is four routes. A stub connector records “No connector; use manual receive” until a site-specific module is added.

**Tech Stack:** Next.js 16 App Router, Prisma/PostgreSQL, NextAuth, Zod, Vitest, existing `Button`/`Input`/`Select`.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-09-17-buying-portals-inventory-design.md`
- Do not reuse `ReplacementClaim` / `ReplacementStockItem`
- `purchasing` and `store` must never write `purchaseRate`, `sellingPrice`, or portal passwords (403 even if the client sends those fields)
- Catalog/portal sync never writes `sellingPrice`
- Purchasing Confirm (or manual receive) is the only way synced HTML becomes stock
- Unique `(portalId, billNumber)`; duplicate confirm is 409
- Negative on-hand is allowed on issue / job_use / spare_sale
- Windows PowerShell: `;` not `&&`; quote paths that contain `(protected)`
- Tests: Vitest (`npx vitest run <file>`)
- Wrap new App Router API handlers with `observeRoute`
- Commit messages: imperative, like existing history (`Add …`)
- No generic scrape-any-URL robot; v1 connector list may be empty

## File map

| File | Responsibility |
|------|----------------|
| `src/lib/admin-roles.ts` | `purchasing` / `store` on `STAFF_ROLES` |
| `src/lib/inventory-access.ts` | Page/API permission helpers |
| `src/lib/portal-pages.ts` | Homes and inventory route guards |
| `src/lib/portal-password.ts` | Encrypt/decrypt vendor logins |
| `src/lib/inventory-stock.ts` | Qty math for receive/issue/count |
| `src/lib/inventory-portals.ts` | Seed names, serialize portal (no password), stub sync |
| `src/lib/inventory-connectors.ts` | `BuyingConnector` registry (empty in v1) |
| `src/lib/validators.ts` | Zod for portal/part/bill/movement |
| `prisma/schema.prisma` | New inventory models |
| `prisma/migrations/20260917010000_buying_inventory/migration.sql` | Tables |
| `prisma/seed.ts` | Upsert six portals |
| `src/app/api/inventory/**` | REST |
| `src/app/api/ops/inventory-sync/route.ts` | Cron + manager Sync now backend |
| `src/app/admin/(protected)/inventory/**` | Four pages |
| `src/components/admin/inventory/*.tsx` | Page clients |
| `src/components/layout/AdminSidebar.tsx` | Nav |
| `src/components/auth/StaffSignInForm.tsx` | Role picker |
| `src/components/admin/StaffPanel.tsx` | Role labels |
| `vercel.json` | Daily portal sync cron |

---

### Task 1: Roles, inventory access, page gates

**Files:**
- Modify: `src/lib/admin-roles.ts`
- Create: `src/lib/inventory-access.ts`
- Modify: `src/lib/portal-pages.ts`
- Modify: `src/lib/__tests__/admin-roles.test.ts`
- Modify: `src/lib/__tests__/portal-pages.test.ts`
- Create: `src/lib/__tests__/inventory-access.test.ts`
- Modify: `src/lib/__tests__/auth-guards.test.ts`
- Modify: `src/components/auth/StaffSignInForm.tsx`
- Modify: `src/components/admin/StaffPanel.tsx`
- Modify: `src/components/layout/AdminSidebar.tsx`

**Interfaces:**
- Consumes: existing `StaffRole`, `assertStaffPageAccess`, `homeRedirectForRole`
- Produces:

```ts
export const PURCHASING_ROLE = "purchasing" as const;
export const STORE_ROLE = "store" as const;
// STAFF_ROLES includes both after admin-roles change

export function canManageBuyingPortals(role: StaffRole): boolean;
export function canReceiveInventory(role: StaffRole): boolean;
export function canIssueInventory(role: StaffRole): boolean;
export function canAuditInventory(role: StaffRole): boolean;
export function canWriteInventoryRates(role: StaffRole): boolean;
export function inventoryHomeForRole(role: StaffRole): string | null;
```

- [ ] **Step 1: Write the failing tests**

Append to `src/lib/__tests__/admin-roles.test.ts`:

```ts
import { STAFF_ROLES } from "@/lib/admin-roles";

it("lists purchasing and store as staff roles", () => {
  expect(STAFF_ROLES).toContain("purchasing");
  expect(STAFF_ROLES).toContain("store");
});

it("does not give purchasing or store the ops portal", () => {
  expect(canUseOpsPortal("purchasing")).toBe(false);
  expect(canUseOpsPortal("store")).toBe(false);
});
```

Create `src/lib/__tests__/inventory-access.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  canAuditInventory,
  canIssueInventory,
  canManageBuyingPortals,
  canReceiveInventory,
  canWriteInventoryRates,
  inventoryHomeForRole,
} from "@/lib/inventory-access";

describe("inventory access", () => {
  it("lets admin and manager manage portals and rates", () => {
    expect(canManageBuyingPortals("admin")).toBe(true);
    expect(canManageBuyingPortals("manager")).toBe(true);
    expect(canManageBuyingPortals("purchasing")).toBe(false);
    expect(canWriteInventoryRates("store")).toBe(false);
    expect(canWriteInventoryRates("manager")).toBe(true);
  });

  it("splits receive vs issue/audit", () => {
    expect(canReceiveInventory("purchasing")).toBe(true);
    expect(canReceiveInventory("store")).toBe(false);
    expect(canIssueInventory("store")).toBe(true);
    expect(canIssueInventory("purchasing")).toBe(false);
    expect(canAuditInventory("store")).toBe(true);
    expect(canAuditInventory("purchasing")).toBe(false);
    expect(canReceiveInventory("manager")).toBe(true);
    expect(canIssueInventory("admin")).toBe(true);
  });

  it("homes purchasing on receive and store on issue", () => {
    expect(inventoryHomeForRole("purchasing")).toBe("/admin/inventory/receive");
    expect(inventoryHomeForRole("store")).toBe("/admin/inventory/issue");
    expect(inventoryHomeForRole("manager")).toBeNull();
  });
});
```

Add cases to `src/lib/__tests__/portal-pages.test.ts`:

```ts
it.each([
  ["purchasing", "/admin/inventory/receive"],
  ["store", "/admin/inventory/issue"],
] as const)("maps %s to its inventory home", (role, expected) => {
  expect(homeRedirectForRole(role)).toBe(expected);
});

it("allows purchasing on receive and blocks issue and vehicles", () => {
  expect(assertStaffPageAccess("/admin/inventory/receive", "purchasing")).toBeNull();
  expect(assertStaffPageAccess("/admin/inventory/issue", "purchasing")).toBe(
    "/admin/inventory/receive",
  );
  expect(assertStaffPageAccess("/admin/vehicles", "purchasing")).toBe(
    "/admin/inventory/receive",
  );
});

it("allows store on issue and audit and blocks portals", () => {
  expect(assertStaffPageAccess("/admin/inventory/issue", "store")).toBeNull();
  expect(assertStaffPageAccess("/admin/inventory/audit", "store")).toBeNull();
  expect(assertStaffPageAccess("/admin/inventory/portals", "store")).toBe(
    "/admin/inventory/issue",
  );
});

it("allows manager on all inventory pages", () => {
  expect(assertStaffPageAccess("/admin/inventory/portals", "manager")).toBeNull();
  expect(assertStaffPageAccess("/admin/inventory/receive", "manager")).toBeNull();
  expect(assertStaffPageAccess("/admin/inventory/issue", "manager")).toBeNull();
  expect(assertStaffPageAccess("/admin/inventory/audit", "manager")).toBeNull();
});
```

Add to `auth-guards.test.ts` rejects list: `"purchasing"` and `"store"`.

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/__tests__/inventory-access.test.ts src/lib/__tests__/admin-roles.test.ts src/lib/__tests__/portal-pages.test.ts`

Expected: FAIL (module or expectations missing).

- [ ] **Step 3: Implement roles and gates**

`src/lib/admin-roles.ts` — add constants and push onto `STAFF_ROLES` after `MECHANIC_ROLE`:

```ts
export const PURCHASING_ROLE = "purchasing" as const;
export const STORE_ROLE = "store" as const;

export const STAFF_ROLES = [
  ADMIN_ROLE,
  MANAGER_ROLE,
  SENIOR_DEVELOPER_ROLE,
  JUNIOR_DEVELOPER_ROLE,
  SALES_ROLE,
  MECHANIC_ROLE,
  PURCHASING_ROLE,
  STORE_ROLE,
] as const;
```

`src/lib/inventory-access.ts`:

```ts
import {
  ADMIN_ROLE,
  MANAGER_ROLE,
  PURCHASING_ROLE,
  STORE_ROLE,
  type StaffRole,
} from "@/lib/admin-roles";

export function canManageBuyingPortals(role: StaffRole): boolean {
  return role === ADMIN_ROLE || role === MANAGER_ROLE;
}

export function canWriteInventoryRates(role: StaffRole): boolean {
  return canManageBuyingPortals(role);
}

export function canReceiveInventory(role: StaffRole): boolean {
  return canManageBuyingPortals(role) || role === PURCHASING_ROLE;
}

export function canIssueInventory(role: StaffRole): boolean {
  return canManageBuyingPortals(role) || role === STORE_ROLE;
}

export function canAuditInventory(role: StaffRole): boolean {
  return canIssueInventory(role);
}

export function inventoryHomeForRole(role: StaffRole): string | null {
  if (role === PURCHASING_ROLE) return "/admin/inventory/receive";
  if (role === STORE_ROLE) return "/admin/inventory/issue";
  return null;
}
```

`homeRedirectForRole`: if `inventoryHomeForRole(role)` return it (before training fallback).

`assertStaffPageAccess`: after change-password, if pathname is `/admin/inventory/portals` require `canManageBuyingPortals`; receive require `canReceiveInventory`; issue require `canIssueInventory`; audit require `canAuditInventory`. On deny return `homeRedirectForRole(role) ?? fallbackRedirectForRole(role)`. Empty pathname for purchasing/store must use inventory home (not training).

`StaffSignInForm` — append two `roleOptions`:

```ts
{ value: "purchasing", label: "Purchasing", description: "Receive portal bills; cannot change rates" },
{ value: "store", label: "Store", description: "Issue, count, and audit stock; cannot change rates" },
```

`StaffPanel` `roleLabels`: `purchasing: "Purchasing"`, `store: "Store"`.

`AdminSidebar` `panelSubtitle`: `purchasing: "Purchasing"`, `store: "Store"`. Add nav items (use `Warehouse` from lucide-react):

```ts
{ href: "/admin/inventory/portals", label: "Buying portals", icon: Warehouse, show: canManageBuyingPortals },
{ href: "/admin/inventory/receive", label: "Receive stock", icon: Package, show: canReceiveInventory },
{ href: "/admin/inventory/issue", label: "Issue & count", icon: ClipboardList, show: canIssueInventory },
{ href: "/admin/inventory/audit", label: "Stock audit", icon: ListChecks, show: canAuditInventory },
```

Place them after Replacement Parts. Import the access helpers.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/__tests__/inventory-access.test.ts src/lib/__tests__/admin-roles.test.ts src/lib/__tests__/portal-pages.test.ts src/lib/__tests__/auth-guards.test.ts src/lib/__tests__/validators.test.ts`

Expected: PASS (`createStaffSchema` already uses `STAFF_ROLES`).

- [ ] **Step 5: Commit**

```bash
git add src/lib/admin-roles.ts src/lib/inventory-access.ts src/lib/portal-pages.ts src/lib/__tests__/inventory-access.test.ts src/lib/__tests__/admin-roles.test.ts src/lib/__tests__/portal-pages.test.ts src/lib/__tests__/auth-guards.test.ts src/components/auth/StaffSignInForm.tsx src/components/admin/StaffPanel.tsx src/components/layout/AdminSidebar.tsx
git commit -m "Add purchasing and store roles with inventory page gates"
```

---

### Task 2: Portal password encryption

**Files:**
- Create: `src/lib/portal-password.ts`
- Create: `src/lib/__tests__/portal-password.test.ts`
- Modify: `.env.example`

**Interfaces:**
- Consumes: `process.env.INVENTORY_PORTAL_SECRET` or `process.env.AUTH_SECRET`
- Produces:

```ts
export function encryptPortalPassword(plain: string): string;
export function decryptPortalPassword(stored: string): string;
```

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it, vi } from "vitest";
import { decryptPortalPassword, encryptPortalPassword } from "@/lib/portal-password";

describe("portal password", () => {
  it("round-trips a non-empty password", () => {
    vi.stubEnv("AUTH_SECRET", "test-auth-secret-for-inventory-key");
    const stored = encryptPortalPassword("vendor-secret");
    expect(stored).not.toBe("vendor-secret");
    expect(decryptPortalPassword(stored)).toBe("vendor-secret");
  });

  it("stores empty as empty", () => {
    expect(encryptPortalPassword("")).toBe("");
    expect(decryptPortalPassword("")).toBe("");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/__tests__/portal-password.test.ts`

Expected: FAIL (module not found).

- [ ] **Step 3: Implement AES-256-GCM**

Use Node `crypto`: key = `createHash("sha256").update(INVENTORY_PORTAL_SECRET || AUTH_SECRET || "dev-inventory-portal").digest()`. Format `ivB64:tagB64:cipherB64`. Throw a clear error if decrypt fails.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/__tests__/portal-password.test.ts`

Expected: PASS.

Add to `.env.example`:

```
# Optional; falls back to AUTH_SECRET. Used to encrypt buying-portal passwords at rest.
# INVENTORY_PORTAL_SECRET="generate-a-secure-random-string"
```

- [ ] **Step 5: Commit**

```bash
git add src/lib/portal-password.ts src/lib/__tests__/portal-password.test.ts .env.example
git commit -m "Add encrypted storage for buying portal passwords"
```

---

### Task 3: Stock math and rate-lock helpers

**Files:**
- Create: `src/lib/inventory-stock.ts`
- Create: `src/lib/__tests__/inventory-stock.test.ts`

**Interfaces:**
- Consumes: none
- Produces:

```ts
export const STOCK_MOVEMENT_KINDS = ["receive", "issue", "job_use", "spare_sale", "count"] as const;
export type StockMovementKind = (typeof STOCK_MOVEMENT_KINDS)[number];

export function applyStockMovement(onHandQty: number, kind: StockMovementKind, qty: number): {
  qtyDelta: number;
  qtyAfter: number;
};

export function purchaseRateSnapshot(args: {
  catalogRate: number | null;
  partPurchaseRate: number;
}): number;

export function rejectRateFieldsIfLocked(
  role: StaffRole,
  body: Record<string, unknown>,
): string | null;
```

`rejectRateFieldsIfLocked` returns `"Rates cannot be changed"` if role cannot write rates and body has `purchaseRate` or `sellingPrice`; otherwise `null`.

- [ ] **Step 1: Write the failing tests**

```ts
import { describe, expect, it } from "vitest";
import {
  applyStockMovement,
  purchaseRateSnapshot,
  rejectRateFieldsIfLocked,
} from "@/lib/inventory-stock";

describe("applyStockMovement", () => {
  it("increases on receive", () => {
    expect(applyStockMovement(2, "receive", 3)).toEqual({ qtyDelta: 3, qtyAfter: 5 });
  });

  it("decreases on issue, job_use, and spare_sale and allows negative", () => {
    expect(applyStockMovement(1, "issue", 2)).toEqual({ qtyDelta: -2, qtyAfter: -1 });
    expect(applyStockMovement(4, "job_use", 1).qtyAfter).toBe(3);
    expect(applyStockMovement(4, "spare_sale", 1).qtyAfter).toBe(3);
  });

  it("sets on-hand to physical qty on count", () => {
    expect(applyStockMovement(10, "count", 7)).toEqual({ qtyDelta: -3, qtyAfter: 7 });
  });
});

describe("purchaseRateSnapshot", () => {
  it("prefers catalog rate when present", () => {
    expect(purchaseRateSnapshot({ catalogRate: 12.5, partPurchaseRate: 10 })).toBe(12.5);
    expect(purchaseRateSnapshot({ catalogRate: null, partPurchaseRate: 10 })).toBe(10);
  });
});

describe("rejectRateFieldsIfLocked", () => {
  it("blocks purchasing and store from sending rate fields", () => {
    expect(rejectRateFieldsIfLocked("purchasing", { purchaseRate: 1 })).toBeTruthy();
    expect(rejectRateFieldsIfLocked("store", { sellingPrice: 2 })).toBeTruthy();
    expect(rejectRateFieldsIfLocked("purchasing", { qty: 1 })).toBeNull();
    expect(rejectRateFieldsIfLocked("manager", { sellingPrice: 9 })).toBeNull();
  });
});
```

Throw `Error("qty must be a positive integer")` if `qty` is not a finite integer `>= 1` for non-count, or `qty < 0` for count. Tests may add that case.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/__tests__/inventory-stock.test.ts`

Expected: FAIL.

- [ ] **Step 3: Implement `inventory-stock.ts`**

Receive: `qtyDelta = qty`. Issue/job_use/spare_sale: `qtyDelta = -qty`. Count: `qtyAfter = qty`, `qtyDelta = qty - onHandQty`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/__tests__/inventory-stock.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/inventory-stock.ts src/lib/__tests__/inventory-stock.test.ts
git commit -m "Add inventory qty math and rate-lock checks"
```

---

### Task 4: Prisma models, migration, seed

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/20260917010000_buying_inventory/migration.sql`
- Modify: `prisma/seed.ts`
- Create: `src/lib/inventory-portals.ts` (seed constant only in this task if easier; full serialize in Task 5 — **put `SEED_BUYING_PORTALS` in `inventory-portals.ts` now**)
- Create: `src/lib/__tests__/inventory-portals.test.ts` (seed list only)

**Interfaces:**
- Produces: Prisma models `BuyingPortal`, `InventoryPart`, `PortalCatalogLine`, `PurchaseBill`, `PurchaseBillLine`, `StockMovement`, `StockCount`, `RateChangeLog`
- Produces: `export const SEED_BUYING_PORTALS: { name: string; websiteUrl: string }[]`

Exact seed names (order): Elyf EV Spare, Vishal Bearing House, Maple, Komaki, E Indiabull, R K Enterprises. Use placeholder URLs `https://example.com/elyf` etc. unless a real URL is already known; Manager will edit.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";
import { SEED_BUYING_PORTALS } from "@/lib/inventory-portals";

it("seeds the six buying portals from the spec", () => {
  expect(SEED_BUYING_PORTALS.map((p) => p.name)).toEqual([
    "Elyf EV Spare",
    "Vishal Bearing House",
    "Maple",
    "Komaki",
    "E Indiabull",
    "R K Enterprises",
  ]);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/__tests__/inventory-portals.test.ts`

Expected: FAIL.

- [ ] **Step 3: Add schema, SQL, seed, constant**

Append to `schema.prisma` (use `Decimal @db.Decimal(12, 2)` for rates):

```prisma
model BuyingPortal {
  id                 String              @id @default(cuid())
  name               String
  websiteUrl         String
  username           String              @default("")
  passwordEncrypted  String              @default("")
  enabled            Boolean             @default(true)
  connectorId        String?
  lastSyncedAt       DateTime?
  lastError          String?
  createdByEmail     String
  createdAt          DateTime            @default(now())
  updatedAt          DateTime            @updatedAt
  catalogLines       PortalCatalogLine[]
  bills              PurchaseBill[]

  @@unique([name])
}

model InventoryPart {
  id             String              @id @default(cuid())
  code           String              @unique
  name           String
  onHandQty      Int                 @default(0)
  purchaseRate   Decimal             @db.Decimal(12, 2)
  sellingPrice   Decimal             @db.Decimal(12, 2)
  createdAt      DateTime            @default(now())
  updatedAt      DateTime            @updatedAt
  catalogLines   PortalCatalogLine[]
  billLines      PurchaseBillLine[]
  movements      StockMovement[]
  counts         StockCount[]
  rateChanges    RateChangeLog[]
}

model PortalCatalogLine {
  id               String         @id @default(cuid())
  portalId         String
  portal           BuyingPortal   @relation(fields: [portalId], references: [id], onDelete: Cascade)
  vendorSku        String
  vendorName       String
  livePurchaseRate Decimal        @db.Decimal(12, 2)
  inventoryPartId  String?
  inventoryPart    InventoryPart? @relation(fields: [inventoryPartId], references: [id], onDelete: SetNull)
  lastSyncedAt     DateTime?
  createdAt        DateTime       @default(now())
  updatedAt        DateTime       @updatedAt

  @@unique([portalId, vendorSku])
}

model PurchaseBill {
  id               String             @id @default(cuid())
  portalId         String
  portal           BuyingPortal       @relation(fields: [portalId], references: [id], onDelete: Restrict)
  billNumber       String
  billDate         DateTime           @db.Date
  source           String
  status           String             @default("draft")
  confirmedByEmail String?
  createdAt        DateTime           @default(now())
  updatedAt        DateTime           @updatedAt
  lines            PurchaseBillLine[]
  movements        StockMovement[]

  @@unique([portalId, billNumber])
  @@index([status])
}

model PurchaseBillLine {
  id                   String         @id @default(cuid())
  billId               String
  bill                 PurchaseBill   @relation(fields: [billId], references: [id], onDelete: Cascade)
  inventoryPartId      String
  inventoryPart        InventoryPart  @relation(fields: [inventoryPartId], references: [id])
  qty                  Int
  purchaseRateSnapshot Decimal        @db.Decimal(12, 2)
}

model StockMovement {
  id        String         @id @default(cuid())
  partId    String
  part      InventoryPart  @relation(fields: [partId], references: [id])
  kind      String
  qtyDelta  Int
  qtyAfter  Int
  billId    String?
  bill      PurchaseBill?  @relation(fields: [billId], references: [id], onDelete: SetNull)
  jobRef    String?
  note      String?
  actorEmail String
  createdAt DateTime       @default(now())

  @@index([partId, createdAt])
  @@index([createdAt])
}

model StockCount {
  id          String        @id @default(cuid())
  partId      String
  part        InventoryPart @relation(fields: [partId], references: [id])
  physicalQty Int
  systemQty   Int
  actorEmail  String
  createdAt   DateTime      @default(now())
}

model RateChangeLog {
  id         String        @id @default(cuid())
  partId     String
  part       InventoryPart @relation(fields: [partId], references: [id])
  field      String
  oldValue   Decimal       @db.Decimal(12, 2)
  newValue   Decimal       @db.Decimal(12, 2)
  source     String
  actorEmail String
  createdAt  DateTime      @default(now())
}
```

Write matching `CREATE TABLE` SQL in the migration folder (Prisma-style, including unique indexes).

`prisma/seed.ts`: after admin upsert, loop `SEED_BUYING_PORTALS` with `upsert` on `name`, `createdByEmail: adminEmail`, empty credentials.

- [ ] **Step 4: Run unit test and generate client**

Run: `npx vitest run src/lib/__tests__/inventory-portals.test.ts`  
Run: `npx prisma generate`

Expected: PASS; client includes new models.

If Docker Postgres is up: `npx prisma migrate deploy` (or `db:migrate` locally). Do not fail the task if migrate is not run in CI without DB; the SQL file must still be complete.

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/20260917010000_buying_inventory prisma/seed.ts src/lib/inventory-portals.ts src/lib/__tests__/inventory-portals.test.ts
git commit -m "Add buying portal and warehouse inventory tables"
```

---

### Task 5: Serialize portals and stub sync

**Files:**
- Modify: `src/lib/inventory-portals.ts`
- Modify: `src/lib/__tests__/inventory-portals.test.ts`
- Create: `src/lib/inventory-connectors.ts`
- Create: `src/lib/__tests__/inventory-connectors.test.ts`

**Interfaces:**

```ts
export type PublicBuyingPortal = {
  id: string;
  name: string;
  websiteUrl: string;
  username: string;
  passwordSaved: boolean;
  enabled: boolean;
  connectorId: string | null;
  lastSyncedAt: string | null;
  lastError: string | null;
};

export function serializeBuyingPortal(row: {
  id: string;
  name: string;
  websiteUrl: string;
  username: string;
  passwordEncrypted: string;
  enabled: boolean;
  connectorId: string | null;
  lastSyncedAt: Date | null;
  lastError: string | null;
}): PublicBuyingPortal;

export type BuyingConnector = {
  id: string;
  fetchBills: (creds: { websiteUrl: string; username: string; password: string }) => Promise<
    { billNumber: string; billDate: string; lines: { vendorSku: string; vendorName: string; qty: number; purchaseRate: number }[] }[]
  >;
  fetchCatalog: (creds: { websiteUrl: string; username: string; password: string }) => Promise<
    { vendorSku: string; vendorName: string; livePurchaseRate: number }[]
  >;
};

export function getBuyingConnector(connectorId: string | null | undefined): BuyingConnector | null;

export const NO_CONNECTOR_ERROR = "No connector; use manual receive.";
```

- [ ] **Step 1: Write the failing tests**

Serialize: `passwordEncrypted: "abc"` → `passwordSaved: true` and no password field. Empty encrypted → `passwordSaved: false`.

`getBuyingConnector("elyf")` and `getBuyingConnector(null)` both `null` in v1.

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/__tests__/inventory-portals.test.ts src/lib/__tests__/inventory-connectors.test.ts`

Expected: FAIL on new assertions.

- [ ] **Step 3: Implement serialize + empty registry**

`inventory-connectors.ts`: `const REGISTRY: Record<string, BuyingConnector> = {}`. `getBuyingConnector` returns `REGISTRY[id] ?? null`.

- [ ] **Step 4: Run tests to verify they pass**

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/inventory-portals.ts src/lib/inventory-connectors.ts src/lib/__tests__/inventory-portals.test.ts src/lib/__tests__/inventory-connectors.test.ts
git commit -m "Add portal serialization and empty buying connector registry"
```

---

### Task 6: Zod validators for inventory APIs

**Files:**
- Modify: `src/lib/validators.ts`
- Modify: `src/lib/__tests__/validators.test.ts`

**Interfaces:**

```ts
export const createBuyingPortalSchema // name, websiteUrl, username optional, password optional, enabled optional, connectorId optional nullable
export const updateBuyingPortalSchema // same fields optional plus enabled
export const upsertInventoryPartSchema // code, name; purchaseRate and sellingPrice optional numbers
export const patchInventoryPartRatesSchema // purchaseRate and/or sellingPrice
export const createInventoryPartNameOnlySchema // code, name only
export const manualReceiveSchema // portalId, billNumber, billDate (yyyy-mm-dd), partId, qty
export const confirmBillSchema // empty object or { } 
export const linkCatalogLineSchema // inventoryPartId
export const stockActionSchema // kind enum, partId, qty, jobRef optional, note optional
export const auditQuerySchema // partId optional, from optional, to optional
```

- [ ] **Step 1: Write failing validator tests** for: valid manual receive; reject qty 0; reject extra `purchaseRate` on `manualReceiveSchema` (schema must not include rate keys); name-only part accepts code+name.

- [ ] **Step 2: Run** `npx vitest run src/lib/__tests__/validators.test.ts` — FAIL.

- [ ] **Step 3: Add schemas** using `z.coerce.number().int().positive()` for qty; dates as `z.string().regex(/^\d{4}-\d{2}-\d{2}$/)`.

- [ ] **Step 4: Run tests** — PASS.

- [ ] **Step 5: Commit** `Add inventory API validators`

---

### Task 7: Portal and part API routes

**Files:**
- Create: `src/app/api/inventory/portals/route.ts`
- Create: `src/app/api/inventory/portals/[id]/route.ts`
- Create: `src/app/api/inventory/parts/route.ts`
- Create: `src/app/api/inventory/parts/[id]/route.ts`
- Create: `src/lib/__tests__/inventory-portals-route.test.ts`
- Create: `src/lib/__tests__/inventory-parts-route.test.ts`
- Create: `src/lib/inventory-sync.ts` — `runBuyingPortalSync(portalId: string): Promise<{ ok: boolean; lastError: string | null }>` used by PATCH sync in Task 8; **in this task** portals POST/GET/PATCH only, plus `POST /api/inventory/portals/[id]/sync` can wait for Task 8. Keep this task to CRUD.

**Interfaces:**
- GET/POST `/api/inventory/portals` — `canManageBuyingPortals` for POST; GET also manager/admin only (purchasing must not list passwords; spec: credentials never in purchasing UI — do not allow purchasing GET portals).
- PATCH `/api/inventory/portals/[id]` — credentials encrypt on password present; never return plaintext.
- GET `/api/inventory/parts` — `canReceiveInventory || canIssueInventory` (purchasing and store can search parts).
- POST `/api/inventory/parts` — if `canWriteInventoryRates`, allow rates; if purchasing, force `purchaseRate` and `sellingPrice` to 0 via name-only schema and ignore rate fields (if rates present, 403 via `rejectRateFieldsIfLocked`).
- PATCH `/api/inventory/parts/[id]` — rates only if `canWriteInventoryRates`; write `RateChangeLog` with `manager_override`.

Session: `requireStaffSession` then check helpers. 401 if no session, 403 if wrong role.

Mock `observeRoute` as identity like `work-assignees-route.test.ts`. Mock `prisma` and `requireStaffSession`.

Tests:
- purchasing POST portal → 403
- manager POST portal encrypts password (`encryptPortalPassword` can be real with stubbed env)
- purchasing GET parts → 200
- purchasing POST part with `purchaseRate` → 403
- purchasing POST `{ code, name }` → prisma create with rates 0
- store PATCH rates → 403
- manager PATCH sellingPrice → 200 and rate log

- [ ] **Step 1: Write failing route tests** (import GET/POST after mocks).

- [ ] **Step 2: Run** `npx vitest run src/lib/__tests__/inventory-portals-route.test.ts src/lib/__tests__/inventory-parts-route.test.ts` — FAIL.

- [ ] **Step 3: Implement routes** with `observeRoute`. Use `$transaction` when patching rates + `rateChangeLog.create`. Serialize Decimal with `Number(value)` or `.toFixed(2)`.

- [ ] **Step 4: Run tests** — PASS.

- [ ] **Step 5: Commit** `Add buying portal and inventory part APIs with rate lock`

---

### Task 8: Receive, movements, audit APIs and stub sync

**Files:**
- Create: `src/app/api/inventory/bills/route.ts` (GET drafts+recent, POST manual receive)
- Create: `src/app/api/inventory/bills/[id]/confirm/route.ts`
- Create: `src/app/api/inventory/catalog-lines/[id]/route.ts` (PATCH link part)
- Create: `src/app/api/inventory/movements/route.ts` (POST issue/job_use/spare_sale/count)
- Create: `src/app/api/inventory/audit/route.ts` (GET)
- Create: `src/app/api/inventory/portals/[id]/sync/route.ts`
- Create: `src/lib/inventory-sync.ts`
- Create: `src/app/api/ops/inventory-sync/route.ts`
- Modify: `vercel.json`
- Create: `src/lib/__tests__/inventory-bills-route.test.ts`
- Create: `src/lib/__tests__/inventory-movements-route.test.ts`
- Create: `src/lib/__tests__/inventory-sync.test.ts`

**Interfaces:**

```ts
export async function runBuyingPortalSync(portalId: string): Promise<{
  ok: boolean;
  lastError: string | null;
}>;
```

Sync behaviour: load portal; if `!getBuyingConnector(portal.connectorId)` set `lastError` to `NO_CONNECTOR_ERROR`, `lastSyncedAt` now, return `{ ok: false, lastError }`. Do not change qty or rates. If a connector exists (v1 none), fetch bills into `PurchaseBill` status `draft` and upsert catalog lines; if linked part, update `purchaseRate` + `RateChangeLog` source `portal_sync`; never touch `sellingPrice`.

Manual receive POST: `canReceiveInventory`; create bill `source: manual`, `status: received`, one line, snapshot via `purchaseRateSnapshot`, `applyStockMovement` receive, create `StockMovement`. On unique violation return 409 `{ error: "Duplicate bill number for this portal" }`.

Confirm POST: bill must be `draft`; then same stock apply; set `received` + `confirmedByEmail`.

Movements POST: `canIssueInventory`; for `count` also create `StockCount`.

Audit GET: `canAuditInventory`; filter partId / from / to; return movements oldest-first with part code, kind, qtyDelta, qtyAfter, actorEmail, rates as numbers from part (read-only).

Cron `GET/POST /api/ops/inventory-sync`: same Bearer `CRON_SECRET` pattern as health-check; sync all `enabled` portals. Manager Sync now uses staff session + `canManageBuyingPortals` on `/api/inventory/portals/[id]/sync`.

`vercel.json` add `{ "path": "/api/ops/inventory-sync", "schedule": "0 2 * * *" }`.

Tests (mock prisma):
- purchasing confirm increases qty (assert `inventoryPart.update` + `stockMovement.create`)
- second confirm/manual same bill number → 409
- purchasing POST movement issue → 403
- store POST issue decreases qty
- failed/stub sync does not call `inventoryPart.update`
- catalog sync helper unit test: function `applyCatalogRateToPart` only updates purchaseRate — implement in `inventory-sync.ts` and test sellingPrice untouched

- [ ] **Step 1: Write failing tests**

- [ ] **Step 2: Run** the four test files — FAIL.

- [ ] **Step 3: Implement handlers + `runBuyingPortalSync`**

Wrap bill confirm + stock update in `prisma.$transaction`.

- [ ] **Step 4: Run tests** — PASS.

- [ ] **Step 5: Commit** `Add inventory receive, issue, audit APIs and portal sync stub`

---

### Task 9: Four inventory pages

**Files:**
- Create: `src/app/admin/(protected)/inventory/portals/page.tsx`
- Create: `src/app/admin/(protected)/inventory/receive/page.tsx`
- Create: `src/app/admin/(protected)/inventory/issue/page.tsx`
- Create: `src/app/admin/(protected)/inventory/audit/page.tsx`
- Create: `src/components/admin/inventory/BuyingPortalsPanel.tsx`
- Create: `src/components/admin/inventory/ReceiveStockPanel.tsx`
- Create: `src/components/admin/inventory/IssueCountPanel.tsx`
- Create: `src/components/admin/inventory/StockAuditPanel.tsx`

**Interfaces:**
- Pages are server components that `requireStaffSession` (layout already gates). Render the matching panel.
- Portals panel: list, add form (name, URL, username, password), enable toggle, Sync now, last error, Parts section (code, name, selling, purchase for manager).
- Receive: draft bills Confirm; manual form portal/bill no/date/part/qty; button “Add part (code + name)” without rate inputs; link catalog line dropdown.
- Issue: kind select issue | job_use | spare_sale | count; part; qty; optional job no.
- Audit: part filter, date from/to, table of movements; show purchaseRate and sellingPrice as text.

Use existing `Button`, `Input`, toast. Match dark admin styling (`slate` like `StaffPanel`).

No dedicated component test unless cheap; rely on API tests. Manually: pages must compile.

- [ ] **Step 1: Add pages and panels** (no new failing test required if API covered; optional smoke: export a `movementKindLabels` map from `inventory-stock.ts` and unit-test labels).

Add to `inventory-stock.ts`:

```ts
export const STOCK_MOVEMENT_KIND_LABELS: Record<StockMovementKind, string> = {
  receive: "Receive",
  issue: "Issue",
  job_use: "Job use",
  spare_sale: "Spare sale",
  count: "Count",
};
```

Test labels exist. Use them in Audit and Issue.

- [ ] **Step 2: Run** `npx vitest run src/lib/__tests__/inventory-stock.test.ts` — PASS.

- [ ] **Step 3: Typecheck pages**

Run: `npx tsc --noEmit`

Expected: no errors in new files.

- [ ] **Step 4: Commit** `Add inventory receive, issue, audit, and portals screens`

---

### Task 10: Wire dashboard home and regression sweep

**Files:**
- Modify: none unless dashboard already uses `homeRedirectForRole` (it does — verify purchasing/store never see vehicle stats).
- Modify tests if dashboard-specific.

**Interfaces:** none new.

- [ ] **Step 1: Confirm** `AdminDashboardPage` already `redirect(homeRedirectForRole(role))` — purchasing and store never hit the stats query. No code if already true.

- [ ] **Step 2: Run full inventory-related tests**

Run: `npx vitest run src/lib/__tests__/inventory-access.test.ts src/lib/__tests__/inventory-stock.test.ts src/lib/__tests__/inventory-portals.test.ts src/lib/__tests__/inventory-connectors.test.ts src/lib/__tests__/portal-password.test.ts src/lib/__tests__/portal-pages.test.ts src/lib/__tests__/admin-roles.test.ts src/lib/__tests__/inventory-portals-route.test.ts src/lib/__tests__/inventory-parts-route.test.ts src/lib/__tests__/inventory-bills-route.test.ts src/lib/__tests__/inventory-movements-route.test.ts src/lib/__tests__/inventory-sync.test.ts src/lib/__tests__/validators.test.ts`

Expected: all PASS.

- [ ] **Step 3: Run** `npx tsc --noEmit` and `npx eslint` on touched files if the repo lint is fast.

- [ ] **Step 4: Commit only if this task produced a dashboard comment or test**; otherwise skip empty commit.

---

## Spec coverage

| Spec item | Task |
|-----------|------|
| Roles purchasing/store, no ops, no rate write | 1, 3, 7 |
| Manager/admin add portals, encrypted login | 2, 7, 9 |
| Seed six portals | 4 |
| Four screens | 9 |
| Receive confirm + manual, no rate inputs | 6, 8, 9 |
| Part code+name by purchasing, rates 0 | 7, 9 |
| Issue, job_use, spare_sale, count, negative qty | 3, 8, 9 |
| Audit list | 8, 9 |
| Duplicate bill 409 | 8 |
| Stub sync, no qty/rate change, selling never from catalog | 5, 8 |
| Cron | 8 |
| Not replacement-parts | 4 (new tables) |
| Connector later | 5 empty registry |

## Placeholder / type check

- Names: `canManageBuyingPortals`, `serializeBuyingPortal`, `runBuyingPortalSync`, `NO_CONNECTOR_ERROR`, `SEED_BUYING_PORTALS`, `applyStockMovement`, `rejectRateFieldsIfLocked` — use these exact identifiers in every task.
- No live Elyf scraper in this plan (matches spec v1).
