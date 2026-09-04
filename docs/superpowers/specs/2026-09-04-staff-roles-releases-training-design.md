# Staff roles, release approval, and training library

Date: 2026-09-04  
Status: design approved in conversation; waiting for spec review before the implementation plan  
Site: Auto Galaxy staff portal (`/admin`)  
Code: same GitHub repo as today (`abhayear/auto-centre`)

## Goal

Give Auto Galaxy named staff logins for **admin**, **manager**, **senior developer**, **junior developer**, **sales** (electric two-wheeler), and **mechanic**.

- Website **code and structure** stay in GitHub. Developers use Cursor or GitHub. Production changes go live only after a **senior developer** (or **admin**) approves, with a **preview** first.
- Approval works in **two places**: GitHub pull-request review/merge, and a portal **Releases** page that merges the same PR.
- **Junior developers** can be assigned any work via a ticket board; they cannot merge to `master`.
- **Training** (scripts, SOPs, videos, files) for sales, mechanic, and manager is **edited only by admin**. Each of those roles logs in and sees only their material.

This is not a visual drag-and-drop site builder and not a second CMS for public HTML.

## Approach

GitHub is the source of truth for code. The portal mirrors open PRs and can merge them with the same rule as GitHub: senior developer or admin. Training and assignments live in Postgres like the rest of the staff app.

## Roles

`AdminUser.role` is one of:

| Role | Sign-in label | Portal | GitHub `master` |
|------|----------------|--------|-----------------|
| `admin` | Admin | Full ops + appoint all staff + training editor + Releases | May merge (optional) |
| `manager` | Manager | Existing ops (vehicles, bookings, GST links, etc.) + **read** manager training | No |
| `senior_developer` | Senior developer | Releases + assign work | Required reviewer; may merge |
| `junior_developer` | Junior developer | My work + preview links | Push branches/PRs; **cannot** merge `master` |
| `sales` | Sales | Training only (sales audience) | No |
| `mechanic` | Mechanic | Training only (mechanic audience) | No |

**Production approval:** one senior-developer **or** admin approval is enough. Admin is not required in addition to senior developer. Junior developer cannot approve.

Existing manager accounts keep role `manager`. Existing admin accounts keep `admin`.

Sign-in stays credentials on `/` staff section and `/admin/login`. The role picker lists all six roles. If the password is valid but the stored role does not match the picker, sign-out and show the same mismatch error used today for admin vs manager.

After login, everyone lands on `/admin`. Sidebar and APIs hide anything their role cannot use. Sales and mechanic who open `/admin/vehicles` get 403 / redirect to `/admin/training`.

## Training library

### Data

`TrainingResource`:

- `id` cuid  
- `audience` `sales` | `mechanic` | `manager`  
- `kind` `script` | `sop` | `video` | `file`  
- `title` string  
- `summary` optional string  
- `body` text (markdown or plain; render safely, no raw HTML)  
- `linkUrl` optional (video or external)  
- `fileUrl` optional (upload via existing `/api/uploads` pattern)  
- `published` boolean (unpublished hidden from non-admin)  
- `sortOrder` int  
- `updatedAt`, `createdAt`  
- `updatedByEmail` string  

Only **admin** may create, update, or delete. Manager, sales, and mechanic **GET** published rows for their audience only. Developers do not need training in v1 (no audience for them).

### UI

- `/admin/training` — list + read for the signed-in audience (manager sees manager materials; sales sees sales; mechanic sees mechanic). Admin sees all audiences with filters and an editor.
- Admin editor: create/edit form. Video = URL. File = upload. Script/SOP = title + body.

No public unauthenticated training URLs.

## Work assignments

`StaffWorkItem`:

- `id` cuid  
- `title`, `notes` text  
- `assigneeId` optional FK `AdminUser`  
- `status` `open` | `in_progress` | `done`  
- `githubPrUrl` optional  
- `previewUrl` optional  
- `createdById` FK `AdminUser`  
- timestamps  

**Create / reassign / set GitHub fields:** admin or senior developer.  
**Update status** on own tickets: junior developer (and the assignee).  
**View:** admin and senior developer see all; junior sees assigned to them.

UI: `/admin/work` — table. Junior default filter = mine.

“Any work” means the ticket text can describe site changes, GST, bookings, or shop tasks. The system does not automate GitHub branch creation.

## Releases (preview then approve)

### GitHub

- Protect `master`: no direct push from juniors; PRs required; at least one approving review from a GitHub user mapped as senior developer (or org CODEOWNERS). Document how to add GitHub usernames in `PRODUCTION_SETUP.md`.
- Vercel Git integration already builds **preview** URLs per PR. The portal shows `previewUrl` from the GitHub/Vercel API when available; staff can paste the URL onto a work item if the API does not return it.

### Portal `/admin/releases`

- Lists open PRs against `master` (GitHub API). Columns: title, author, preview link, checks summary if cheap to fetch.
- Button **Approve & merge** visible to `senior_developer` and `admin` only. It merges the PR (merge commit, matching this repo’s style) using `GITHUB_RELEASES_TOKEN` (fine-grained PAT or GitHub App) with `contents:write` and `pull_requests:write`. After merge, existing Vercel production deploy from `master` applies.
- Failures (403, checks failing, missing token): show the GitHub error; do not force-merge.
- Junior developers see the list and preview links, not the merge button.

If `GITHUB_RELEASES_TOKEN` is unset, the page still lists PRs if a read token exists; merge is disabled with a setup message. Read can use the same token with `contents:read` + `pull_requests:read`.

Repo owner/name from env `GITHUB_REPO` default `abhayear/auto-centre`.

## Staff appointment

Replace “managers only” admin page with **Staff** (`/admin/staff`): admin creates email + password + role + active flag for all six roles. Keep `/admin/managers` as a redirect to `/admin/staff?role=manager` or retire it after a redirect so old bookmarks work.

Admin-only nav: Staff, Training editor, Releases (admin also sees Releases). Senior developer: Work, Releases. Junior: Work. Manager: existing + Training. Sales/mechanic: Training only.

## Auth and APIs

Extend `StaffRole` in `src/lib/admin-roles.ts` with helpers:

- `canEditTraining` → admin  
- `canReadTraining(audience)` → admin or matching role (manager reads manager)  
- `canAssignWork` → admin or senior_developer  
- `canMergeReleases` → admin or senior_developer  
- `canUseOpsPortal` → admin or manager (vehicles, bookings, GST, etc.)  
- `canViewReleases` → admin, senior_developer, junior_developer  

`requireAdmin()` today means “any logged-in staff”. Keep that for session. Split route guards so sales cannot call `/api/vehicles`. Ops APIs stay `canUseOpsPortal`. New APIs for training, work, releases, staff CRUD.

## Error handling

- Unauthorized: 401. Forbidden role: 403.  
- GitHub merge failure: 502 with message, ticket unchanged.  
- Training file upload failure: keep existing upload error JSON.  
- Inactive `AdminUser`: cannot sign in (same as today).

## Testing

Vitest, no live GitHub/Vercel in unit tests. Mock GitHub merge. Cover role helpers, training audience filtering, work assignee rules, sign-in role mismatch for new roles.

## Out of scope

- Drag-and-drop page builder or in-browser HTML/CSS for public pages.  
- Sales/mechanic access to bookings, cash box, or GST tools.  
- Requiring both admin and senior developer to approve.  
- Auto-creating GitHub branches from work tickets.  
- Slack/email on every PR (optional later).

## Operator setup

Document in `PRODUCTION_SETUP.md`:

- `GITHUB_RELEASES_TOKEN`  
- `GITHUB_REPO`  
- GitHub branch protection on `master`  
- Vercel preview deployments for PRs  
- Map GitHub usernames to senior developers  

## Success criteria

1. Admin can create a sales, mechanic, junior, and senior login.  
2. Sales sees only published sales training; cannot edit.  
3. Mechanic and manager likewise for their audiences.  
4. Junior cannot merge from the portal; senior can merge a PR with a preview link visible.  
5. Same PR can still be merged on GitHub by a senior with review rights.  
6. Manager ops sidebar unchanged except Training added.  
