# Staff Roles, Releases, and Training Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add six staff roles, admin-only training for sales/mechanic/manager, assignable work tickets, and GitHub PR preview/merge (portal + GitHub) so production changes require senior-developer or admin approval.

**Architecture:** `AdminUser.role` drives the sidebar and API guards. Training and work tickets live in Prisma. Releases list/merge GitHub PRs against `master` via `fetch` + `GITHUB_RELEASES_TOKEN`. Vercel preview URLs come from GitHub/Vercel; merge to `master` keeps the existing production deploy path. No visual page builder.

**Tech Stack:** Next.js 16 App Router, Prisma/PostgreSQL, NextAuth credentials, Vitest, GitHub REST API (`fetch`, no Octokit).

## Global Constraints

- Spec: `docs/superpowers/specs/2026-09-04-staff-roles-releases-training-design.md`
- Roles (exact strings): `admin`, `manager`, `senior_developer`, `junior_developer`, `sales`, `mechanic`
- Production merge: `senior_developer` **or** `admin` is enough; junior cannot merge
- Training edit: **admin only**; readers see only their audience; unpublished hidden from non-admin
- GitHub repo env: `GITHUB_REPO` default `abhayear/auto-centre`
- Merge token: `GITHUB_RELEASES_TOKEN`
- Tests: Vitest, mock GitHub, no live network
- Windows shells: `;` not `&&`
- Wrap new App Router handlers with `observeRoute` except `src/app/api/ops/**` and NextAuth
- Do not add a visual HTML/CSS page builder
- Do not give sales/mechanic access to bookings, cash box, or GST tools
- Keep existing manager ops behavior; add Training to their sidebar
- Commit messages: imperative, like existing history (`Add …` / `Guard …`)

## File map

| File | Responsibility |
|------|----------------|
| `src/lib/admin-roles.ts` | Role constants and permission helpers |
| `src/lib/auth.ts` | `requireStaffSession`, `requireOpsPortal`, `requireAdminRole` |
| `src/components/auth/StaffSignInForm.tsx` | Six-role picker |
| `src/components/layout/AdminSidebar.tsx` | Role-filtered nav |
| `prisma/schema.prisma` | `TrainingResource`, `StaffWorkItem` |
| `src/app/api/admin/staff/route.ts` | Appoint any role |
| `src/app/api/training/route.ts` | Training CRUD/list |
| `src/app/api/work/route.ts` | Work tickets |
| `src/lib/github/releases.ts` | List/merge PRs |
| `src/app/api/releases/route.ts` | Portal Releases API |
| `src/app/admin/(protected)/training/page.tsx` | Training UI |
| `src/app/admin/(protected)/work/page.tsx` | Work board |
| `src/app/admin/(protected)/releases/page.tsx` | PR list + merge |
| `src/app/admin/(protected)/staff/page.tsx` | Staff admin |
| `PRODUCTION_SETUP.md` | Tokens and branch protection |

---

### Task 1: Role permission helpers

**Files:**
- Modify: `src/lib/admin-roles.ts`
- Modify: `src/lib/__tests__/admin-roles.test.ts`

**Interfaces:**
- Consumes: none
- Produces: `STAFF_ROLES`, `StaffRole`, `canEditTraining`, `canReadTraining`, `canAssignWork`, `canMergeReleases`, `canUseOpsPortal`, `canViewReleases`, `trainingAudienceForRole`

- [ ] **Step 1: Write failing tests**

Replace `src/lib/__tests__/admin-roles.test.ts` with:

```ts
import { describe, expect, it } from "vitest";
import {
  canAssignWork,
  canEditCashBox,
  canEditTraining,
  canMergeReleases,
  canReadTraining,
  canUseOpsPortal,
  canViewReleases,
  trainingAudienceForRole,
} from "@/lib/admin-roles";

describe("canEditCashBox", () => {
  it("allows admin and restricts manager", () => {
    expect(canEditCashBox("admin")).toBe(true);
    expect(canEditCashBox("manager")).toBe(false);
  });
});

describe("portal permissions", () => {
  it("limits training edits to admin", () => {
    expect(canEditTraining("admin")).toBe(true);
    expect(canEditTraining("manager")).toBe(false);
    expect(canEditTraining("sales")).toBe(false);
  });

  it("lets each audience read only its training", () => {
    expect(canReadTraining("sales", "sales")).toBe(true);
    expect(canReadTraining("sales", "mechanic")).toBe(false);
    expect(canReadTraining("manager", "manager")).toBe(true);
    expect(canReadTraining("admin", "sales")).toBe(true);
  });

  it("gates ops, work, releases, and merge", () => {
    expect(canUseOpsPortal("manager")).toBe(true);
    expect(canUseOpsPortal("sales")).toBe(false);
    expect(canUseOpsPortal("junior_developer")).toBe(false);
    expect(canAssignWork("senior_developer")).toBe(true);
    expect(canAssignWork("junior_developer")).toBe(false);
    expect(canViewReleases("junior_developer")).toBe(true);
    expect(canViewReleases("manager")).toBe(false);
    expect(canMergeReleases("senior_developer")).toBe(true);
    expect(canMergeReleases("admin")).toBe(true);
    expect(canMergeReleases("junior_developer")).toBe(false);
  });

  it("maps roles to training audiences", () => {
    expect(trainingAudienceForRole("sales")).toBe("sales");
    expect(trainingAudienceForRole("mechanic")).toBe("mechanic");
    expect(trainingAudienceForRole("manager")).toBe("manager");
    expect(trainingAudienceForRole("admin")).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests — expect FAIL**

Run: `npx vitest run src/lib/__tests__/admin-roles.test.ts`

Expected: FAIL (exports missing)

- [ ] **Step 3: Implement helpers**

Replace `src/lib/admin-roles.ts` with:

```ts
export const ADMIN_ROLE = "admin" as const;
export const MANAGER_ROLE = "manager" as const;
export const SENIOR_DEVELOPER_ROLE = "senior_developer" as const;
export const JUNIOR_DEVELOPER_ROLE = "junior_developer" as const;
export const SALES_ROLE = "sales" as const;
export const MECHANIC_ROLE = "mechanic" as const;

export const STAFF_ROLES = [
  ADMIN_ROLE,
  MANAGER_ROLE,
  SENIOR_DEVELOPER_ROLE,
  JUNIOR_DEVELOPER_ROLE,
  SALES_ROLE,
  MECHANIC_ROLE,
] as const;

export type StaffRole = (typeof STAFF_ROLES)[number];
export type TrainingAudience = "sales" | "mechanic" | "manager";

export function isStaffRole(role: string): role is StaffRole {
  return (STAFF_ROLES as readonly string[]).includes(role);
}

export function isAdminRole(role: string): role is typeof ADMIN_ROLE {
  return role === ADMIN_ROLE;
}

export function isManagerRole(role: string): role is typeof MANAGER_ROLE {
  return role === MANAGER_ROLE;
}

export function canEditCashBox(role: StaffRole): boolean {
  return role === ADMIN_ROLE;
}

export function canEditTraining(role: StaffRole): boolean {
  return role === ADMIN_ROLE;
}

export function canReadTraining(role: StaffRole, audience: TrainingAudience): boolean {
  if (role === ADMIN_ROLE) return true;
  return trainingAudienceForRole(role) === audience;
}

export function canAssignWork(role: StaffRole): boolean {
  return role === ADMIN_ROLE || role === SENIOR_DEVELOPER_ROLE;
}

export function canMergeReleases(role: StaffRole): boolean {
  return role === ADMIN_ROLE || role === SENIOR_DEVELOPER_ROLE;
}

export function canUseOpsPortal(role: StaffRole): boolean {
  return role === ADMIN_ROLE || role === MANAGER_ROLE;
}

export function canViewReleases(role: StaffRole): boolean {
  return (
    role === ADMIN_ROLE ||
    role === SENIOR_DEVELOPER_ROLE ||
    role === JUNIOR_DEVELOPER_ROLE
  );
}

export function trainingAudienceForRole(role: StaffRole): TrainingAudience | null {
  if (role === SALES_ROLE || role === MECHANIC_ROLE || role === MANAGER_ROLE) {
    return role;
  }
  return null;
}
```

- [ ] **Step 4: Run tests — expect PASS**

Run: `npx vitest run src/lib/__tests__/admin-roles.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/admin-roles.ts src/lib/__tests__/admin-roles.test.ts
git commit -m "Add staff role permission helpers for training and releases."
```

---

### Task 2: Prisma models and migration

**Files:**
- Modify: `prisma/schema.prisma` (append after `AdminUser`)
- Create: `prisma/migrations/20260904120000_add_staff_training_work/migration.sql`

**Interfaces:**
- Consumes: existing `AdminUser`
- Produces: `TrainingResource`, `StaffWorkItem`

- [ ] **Step 1: Append models** after `AdminUser` in `prisma/schema.prisma`:

```prisma
model TrainingResource {
  id              String   @id @default(cuid())
  audience        String
  kind            String
  title           String
  summary         String?
  body            String   @db.Text
  linkUrl         String?
  fileUrl         String?
  published       Boolean  @default(false)
  sortOrder       Int      @default(0)
  updatedByEmail  String
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@index([audience, published])
}

model StaffWorkItem {
  id           String    @id @default(cuid())
  title        String
  notes        String    @db.Text
  status       String    @default("open")
  githubPrUrl  String?
  previewUrl   String?
  assigneeId   String?
  assignee     AdminUser? @relation("WorkAssignee", fields: [assigneeId], references: [id])
  createdById  String
  createdBy    AdminUser  @relation("WorkCreatedBy", fields: [createdById], references: [id])
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt

  @@index([assigneeId, status])
}
```

Add on `AdminUser`:

```prisma
  assignedWork StaffWorkItem[] @relation("WorkAssignee")
  createdWork  StaffWorkItem[] @relation("WorkCreatedBy")
```

- [ ] **Step 2: Write SQL** `prisma/migrations/20260904120000_add_staff_training_work/migration.sql` matching existing migration style (`CREATE TABLE`, indexes). Include `TrainingResource` and `StaffWorkItem` with FKs to `AdminUser` on `assigneeId` / `createdById` (`ON DELETE SET NULL` for assignee, `ON DELETE RESTRICT` for createdBy).

- [ ] **Step 3: Generate client**

Run: `npx prisma generate`

Expected: success. Do not migrate production from this task.

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/20260904120000_add_staff_training_work
git commit -m "Add training resource and staff work item tables."
```

---

### Task 3: Session helpers and ops API guards

**Files:**
- Modify: `src/lib/auth.ts`
- Modify: every ops `src/app/api/**/route.ts` that currently imports `requireAdmin` **except** `src/app/api/admin/change-password/route.ts` (any staff) and `src/app/api/admin/managers/route.ts` (stays `requireAdminRole` until Task 4)
- Test: `src/lib/__tests__/auth-guards.test.ts` (pure wrappers if needed — prefer testing `canUseOpsPortal` already done; add `requireOpsPortal` by exporting a small `assertOpsRole(role)` if mocking NextAuth is heavy)

**Interfaces:**
- Consumes: Task 1 helpers
- Produces: `requireStaffSession` (rename of today’s `requireAdmin` body), `requireOpsPortal`, keep `requireAdminRole`

- [ ] **Step 1: Implement auth helpers**

In `src/lib/auth.ts`:

- Import `canUseOpsPortal`, `isStaffRole`, `type StaffRole`
- Rename current `requireAdmin` implementation to `requireStaffSession` (same body). Export `requireAdmin` as an alias to `requireStaffSession` **or** replace all call sites: prefer **replace** — `requireAdmin` becomes confusing.
- Add:

```ts
export async function requireStaffSession() {
  // existing requireAdmin body
}

export async function requireOpsPortal() {
  const session = await requireStaffSession();
  if (!session) return null;
  const role = session.user.role;
  if (!isStaffRole(role) || !canUseOpsPortal(role)) return null;
  return session;
}
```

- [ ] **Step 2: Swap ops routes**

In each of these files, change `requireAdmin` to `requireOpsPortal`:

`vehicles/route.ts`, `vehicles/[id]/route.ts`, `uploads/route.ts`, `system-health/route.ts`, `site-settings/route.ts`, `site-analytics/route.ts`, `showroom-walk-ins/route.ts`, `services/route.ts`, `services/[id]/route.ts`, `service-schedule/route.ts`, `service-centre/route.ts`, `service-areas/route.ts`, `jobs/route.ts`, `jobs/[id]/route.ts`, `job-applications/route.ts`, `job-applications/[id]/route.ts`, `job-applications/stats/route.ts`, `inquiries/route.ts`, `inquiries/[id]/route.ts`, `esteemed-customers/route.ts`, `cloud-vitals/advise/route.ts`, `cash-box/route.ts`, `cash-box/[id]/route.ts`, `bookings/route.ts`, `bookings/[id]/route.ts`, `replacement-parts/route.ts`

Keep `change-password` on `requireStaffSession`.

Return 403 JSON `{ error: "Forbidden" }` when `requireOpsPortal` is null (same as forbidden managers). If a route currently returns 401 for missing session, keep 401 for null session and 403 for logged-in non-ops: optional refinement — if too messy, treat all null as 403 like managers route.

- [ ] **Step 3: Fix tests** that mock `requireAdmin` for ops routes: mock `requireOpsPortal` instead (`system-health-route.test.ts` and any others).

Run: `npx vitest run`

Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/lib/auth.ts src/app/api src/lib/__tests__
git commit -m "Guard operations APIs to admin and manager roles."
```

---

### Task 4: Staff appointment API and sign-in picker

**Files:**
- Modify: `src/lib/validators.ts` (createStaffSchema with `role: z.enum(STAFF_ROLES)`)
- Create: `src/app/api/admin/staff/route.ts` (GET/POST/PATCH/DELETE, `observeRoute`, `requireAdminRole`)
- Modify: `src/app/api/admin/managers/route.ts` — re-export or redirect logic: keep GET as filter `role=manager` **or** make managers route call the same prisma with manager filter; simplest: managers POST still creates manager; staff route handles all roles. Spec: `/admin/managers` redirects. API: staff CRUD is enough; keep managers API working for old UI until page redirect.
- Modify: `src/components/auth/StaffSignInForm.tsx` — six role options; mismatch message uses `role.replaceAll("_", " ")`
- Create: `src/app/admin/(protected)/staff/page.tsx` + `src/components/admin/StaffPanel.tsx` (clone `ManagersPanel`, add role select)
- Modify: `src/app/admin/(protected)/managers/page.tsx` to `redirect("/admin/staff?role=manager")`

**Interfaces:**
- Consumes: Task 1 `STAFF_ROLES`
- Produces: `/api/admin/staff` JSON `{ id, email, role, active, createdAt, updatedAt }`

- [ ] **Step 1: Add schemas**

```ts
import { STAFF_ROLES } from "@/lib/admin-roles";

export const createStaffSchema = z.object({
  email: z.string().email("Valid email is required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: z.enum(STAFF_ROLES),
});

export const updateStaffSchema = z.object({
  id: z.string().min(1),
  active: z.boolean().optional(),
  password: z.string().min(8).optional(),
  role: z.enum(STAFF_ROLES).optional(),
});
```

- [ ] **Step 2: Implement staff route** like managers route but `role` from body; GET lists all staff `select` including `role`; never delete the last remaining `admin`.

- [ ] **Step 3: Sign-in options** — add senior developer, junior developer, sales, mechanic descriptions. Compare `actualRole !== role` for all six.

- [ ] **Step 4: Staff UI** — table of all users; form email, password, role. Do not show password hashes.

- [ ] **Step 5: Run** `npx vitest run` and eslint on touched files.

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git commit -m "Add staff appointment for all portal roles."
```

---

### Task 5: Sidebar and training-only home

**Files:**
- Modify: `src/components/layout/AdminSidebar.tsx`
- Create: `src/app/admin/(protected)/training/page.tsx` (placeholder list “Loading training…” until Task 6; or skip page until Task 6 — **include empty published list fetch** if API exists; if not, static heading only then Task 6 fills it)
- Modify: `src/app/admin/(protected)/page.tsx` if it assumes manager/admin dashboard widgets — hide ops widgets for sales/mechanic/developers

**Interfaces:**
- Consumes: Task 1 flags
- Produces: nav items with `showIf: (role) => boolean`

- [ ] **Step 1: Nav model**

Each item: `{ href, label, icon, show: (role: StaffRole) => boolean, external?: boolean }`

- Ops items: `canUseOpsPortal`
- GST/store externals: `canUseOpsPortal`
- Training: `canReadTraining(role, "sales") || … || canEditTraining` i.e. admin, manager, sales, mechanic
- Work: `canAssignWork(role) || role === "junior_developer"`
- Releases: `canViewReleases`
- Staff: `isAdminRole`
- Change password: everyone
- Cloud Vitals: `canUseOpsPortal` (not developers)

Sales/mechanic: only Training + password + sign out.

- [ ] **Step 2: Dashboard** — if `!canUseOpsPortal(role)` redirect to `/admin/training` (developers to `/admin/work` if junior/senior, `/admin/releases` optional; **senior → `/admin/releases`**, **junior → `/admin/work`**, **sales/mechanic → `/admin/training`**).

- [ ] **Step 3: Commit**

```bash
git commit -m "Filter the staff sidebar and home by role."
```

---

### Task 6: Training API

**Files:**
- Create: `src/app/api/training/route.ts` (GET, POST, PATCH, DELETE) + `observeRoute`
- Modify: `src/lib/validators.ts` — `trainingResourceSchema`
- Test: `src/lib/__tests__/training-access.test.ts` for filter function extracted to `src/lib/training-access.ts`

**Interfaces:**
- Consumes: `canEditTraining`, `canReadTraining`, `requireStaffSession`
- Produces: `filterTrainingForRole(role, rows)` 

```ts
export const TRAINING_KINDS = ["script", "sop", "video", "file"] as const;
export const TRAINING_AUDIENCES = ["sales", "mechanic", "manager"] as const;

export function visibleTrainingRows(
  role: StaffRole,
  rows: { audience: string; published: boolean }[],
) {
  if (canEditTraining(role)) return rows;
  return rows.filter(
    (row) =>
      row.published &&
      canReadTraining(role, row.audience as TrainingAudience),
  );
}
```

GET: `requireStaffSession`; if cannot read any training (`trainingAudienceForRole` null && !admin) → 403. Admin GET all. Others GET published + their audience.

POST/PATCH/DELETE: `canEditTraining` else 403. Set `updatedByEmail` from session.

- [ ] **Step 1: Failing tests** for `visibleTrainingRows`
- [ ] **Step 2: Implement filter + route**
- [ ] **Step 3: `npx vitest run src/lib/__tests__/training-access.test.ts`** PASS
- [ ] **Step 4: Commit** `Add training library API with audience filtering.`

---

### Task 7: Training UI

**Files:**
- Modify: `src/app/admin/(protected)/training/page.tsx`
- Create: `src/components/admin/TrainingLibrary.tsx`

**Interfaces:**
- Consumes: `/api/training`
- Produces: list + admin editor (title, audience, kind, summary, body, linkUrl, fileUrl via existing upload, published, sortOrder)

Render `body` as text with `whitespace-pre-wrap` (no `dangerouslySetInnerHTML`). Video: if `linkUrl`, show `<a target="_blank">`. File: link `fileUrl`.

- [ ] **Step 1: Build UI** matching existing admin panels (slate, toast, Button/Input)
- [ ] **Step 2: Commit** `Add the staff training library pages.`

---

### Task 8: Work tickets API

**Files:**
- Create: `src/lib/work-access.ts` + tests
- Create: `src/app/api/work/route.ts` (GET, POST, PATCH) `observeRoute`

**Interfaces:**

```ts
export function canViewWorkItem(
  role: StaffRole,
  userId: string,
  item: { assigneeId: string | null; createdById: string },
): boolean {
  if (canAssignWork(role)) return true;
  return item.assigneeId === userId;
}

export function canPatchWorkItem(
  role: StaffRole,
  userId: string,
  item: { assigneeId: string | null },
  patch: { status?: string; assigneeId?: string | null; title?: string },
): boolean {
  if (canAssignWork(role)) return true;
  if (item.assigneeId !== userId) return false;
  const keys = Object.keys(patch);
  return keys.every((key) => key === "status");
}
```

POST: `canAssignWork`. PATCH: rules above. Status enum `open` | `in_progress` | `done`. `requireStaffSession`. Include `user.id` on session — extend NextAuth types if `id` missing (`auth.config.ts` jwt/session callbacks).

- [ ] **Step 1: Confirm session user id** — if missing, add `token.id` / `session.user.id` from `AdminUser.id` in `auth.ts` authorize + jwt callback in `auth.config.ts`.
- [ ] **Step 2: Tests for work-access**
- [ ] **Step 3: Implement route**
- [ ] **Step 4: Commit** `Add assignable staff work tickets.`

---

### Task 9: Work UI

**Files:**
- Create: `src/app/admin/(protected)/work/page.tsx`
- Create: `src/components/admin/WorkBoard.tsx`

Admin/senior: create form (title, notes, assignee select from GET `/api/admin/staff` — **403 for senior**. Senior cannot call staff API.

**Fix:** GET `/api/admin/staff` for `canAssignWork` as a thinner endpoint `GET /api/work/assignees` returning `{ id, email, role }[]` for junior_developer and others, `require` `canAssignWork`.

Add `src/app/api/work/assignees/route.ts` GET, `canAssignWork`.

Junior: list mine; status dropdown.

- [ ] **Step 1: Assignees endpoint + board UI**
- [ ] **Step 2: Commit** `Add the staff work board.`

---

### Task 10: GitHub releases client

**Files:**
- Create: `src/lib/github/releases.ts`
- Test: `src/lib/__tests__/github-releases.test.ts` with mocked `fetch`

**Interfaces:**

```ts
export type ReleasePullRequest = {
  number: number;
  title: string;
  htmlUrl: string;
  author: string;
  previewUrl: string | null;
  mergeable: boolean | null;
};

export async function listOpenPullRequests(input: {
  repo: string;
  token: string;
  fetchFn?: typeof fetch;
}): Promise<ReleasePullRequest[]>

export async function mergePullRequest(input: {
  repo: string;
  token: string;
  number: number;
  fetchFn?: typeof fetch;
}): Promise<{ merged: boolean; message: string }>
```

`listOpenPullRequests`: `GET https://api.github.com/repos/${repo}/pulls?state=open&base=master`. Map `user.login`, `html_url`. Preview: look at PR `_links` or `GET /repos/{repo}/commits/{sha}/status` — simpler: parse `body` for `https://*.vercel.app` **or** `GET https://api.github.com/repos/${repo}/deployments?environment=Preview` if flaky, set `previewUrl` from first Vercel URL in `body` else null.

`mergePullRequest`: `PUT /repos/{repo}/pulls/{number}/merge` JSON `{ merge_method: "merge" }`. On non-OK return `{ merged: false, message: text }`.

Tests: mock fetch sequences.

- [ ] **Step 1: Failing tests**
- [ ] **Step 2: Implement**
- [ ] **Step 3: PASS + commit** `Add GitHub pull request list and merge helpers.`

---

### Task 11: Releases API and UI

**Files:**
- Create: `src/app/api/releases/route.ts` GET (list) POST `{ number }` merge
- Create: `src/app/admin/(protected)/releases/page.tsx`
- Create: `src/components/admin/ReleasesPanel.tsx`

GET: `canViewReleases` else 403. If no token, `[]` plus `{ configured: false }`.

POST: `canMergeReleases` else 403. Call `mergePullRequest`. 502 on `{ merged: false }`.

UI: table; preview link; **Approve & merge** only if `canMergeReleases` (pass from page via session). Junior: no button.

- [ ] **Step 1: Implement**
- [ ] **Step 2: Commit** `Add the staff releases page for preview and merge.`

---

### Task 12: Operator docs and full test

**Files:**
- Modify: `PRODUCTION_SETUP.md`

Document:

```
GITHUB_REPO=abhayear/auto-centre
GITHUB_RELEASES_TOKEN=<github PAT: repo pull requests read/write>
```

Branch protection: `master` requires PR + 1 approving review. Map GitHub usernames to senior developers. Vercel: enable Preview Deployments for PRs.

- [ ] **Step 1: Write docs**
- [ ] **Step 2: `npx vitest run`** PASS
- [ ] **Step 3: `npx eslint src/lib/admin-roles.ts src/lib/auth.ts src/lib/github src/app/api/training src/app/api/work src/app/api/releases src/app/api/admin/staff src/app/admin/(protected)/training src/app/admin/(protected)/work src/app/admin/(protected)/releases src/app/admin/(protected)/staff`** 0 errors
- [ ] **Step 4: Commit** `Document GitHub release tokens and branch protection.`

---

## Spec coverage

| Spec item | Task |
|-----------|------|
| Six roles + helpers | 1 |
| TrainingResource / StaffWorkItem | 2 |
| Ops APIs not for sales/mechanic | 3 |
| Appoint all roles; managers redirect | 4 |
| Sidebar + landing by role | 5 |
| Training API audience + admin edit | 6 |
| Training UI | 7 |
| Work tickets + junior status-only | 8–9 |
| GitHub list/merge + preview | 10–11 |
| Token + branch protection docs | 12 |
| Senior or admin merge; junior cannot | 1, 11 |
| No page builder | (none) |

## Placeholder scan

No TBD. `previewUrl` extraction is defined as Vercel URL in PR body, else null.

## Type consistency

`StaffRole`, `TrainingAudience`, `ReleasePullRequest`, work `status` strings match across tasks.
