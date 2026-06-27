# CI/CD Setup Guide

Repository: **https://github.com/abhayear/auto-centre**

See also: **[BRANCHING.md](./BRANCHING.md)** for the full branch and deployment model.

## Pipeline overview

| Workflow | File | Trigger | Purpose |
|----------|------|---------|---------|
| **CI** | `.github/workflows/ci.yml` | Push/PR → `main`, `master`, `develop` | Lint → **unit tests** → migrate → build |
| **Deploy staging** | `.github/workflows/deploy-staging.yml` | Push → `develop` | Vercel preview / staging |
| **Deploy production** | `.github/workflows/deploy-vercel.yml` | Push → `main`/`master` | Vercel production |
| **Deploy Docker** | `.github/workflows/deploy-docker.yml` | Push → `develop` / `main` | GHCR `:staging` or `:latest` |

View runs: **https://github.com/abhayear/auto-centre/actions**

---

## Branch flow

```text
feature/* → PR → develop → staging deploy
                    ↓
              PR → main → production deploy
```

1. Work on `feature/*` branches; open PRs into **`develop`**
2. Merging to **`develop`** runs CI + deploys to **staging**
3. When ready, PR **`develop` → `main`**; merge deploys to **production**

---

## Step 1 — CI (automatic)

CI runs on every push/PR to `main`, `master`, or `develop`. No secrets required.

Jobs:

1. **Lint and unit tests** — ESLint + Vitest
2. **Migrate and build** — Postgres service, `prisma migrate deploy`, `next build`

Local equivalent:

```powershell
npm run lint
npm test
npm run build
```

---

## Step 2 — Production database (Neon)

1. Create account at [neon.tech](https://neon.tech)
2. New project → copy **connection string**
3. Ensure URL includes `?sslmode=require`
4. (Optional) Create a second Neon database for **staging**

---

## Step 3 — Vercel project

1. [vercel.com](https://vercel.com) → **Add New Project**
2. Import **`abhayear/auto-centre`**
3. Set **Production Branch** to `main` (or `master`)
4. Add environment variables:

**Production** (main branch):

```
DATABASE_URL=postgresql://...?sslmode=require
NEXTAUTH_SECRET=<random-32+-chars>
AUTH_SECRET=<same-as-above>
NEXTAUTH_URL=https://your-app.vercel.app
ADMIN_EMAIL=admin@yourdomain.com
ADMIN_PASSWORD=<strong-password>
```

**Preview** (develop / PR branches) — use a separate staging database and URL:

```
DATABASE_URL=postgresql://...staging...?sslmode=require
NEXTAUTH_URL=https://your-staging-url.vercel.app
```

5. Deploy once from the Vercel dashboard

---

## Step 4 — GitHub secrets & environments

Go to: **https://github.com/abhayear/auto-centre/settings/secrets/actions**

| Secret | How to get it |
|--------|----------------|
| `VERCEL_TOKEN` | Vercel → Account Settings → [Tokens](https://vercel.com/account/tokens) |
| `VERCEL_ORG_ID` | Run locally after `vercel link`: `cat .vercel/project.json` |
| `VERCEL_PROJECT_ID` | Same file as above |

Create GitHub **environments**:

| Name | Deployed from | Suggested protection |
|------|---------------|----------------------|
| `staging` | `develop` | Optional reviewers |
| `production` | `main` / `master` | Required reviewers recommended |

---

## Step 5 — Automatic deploys

After secrets and environments are configured:

| Event | Result |
|-------|--------|
| Push to `develop` | CI → staging Vercel deploy → Docker `:staging` |
| Push to `main` | CI → production Vercel deploy → Docker `:latest` |
| PR to any protected branch | CI only (no deploy) |

Manual deploy: **Actions** tab → choose workflow → **Run workflow**

---

## Step 6 — Seed databases

**Staging:**

```powershell
$env:DATABASE_URL="your-staging-neon-url"
$env:ADMIN_EMAIL="admin@autocentre.com"
$env:ADMIN_PASSWORD="staging-password"
npm run db:seed
```

**Production:**

```powershell
$env:DATABASE_URL="your-production-neon-url"
$env:ADMIN_EMAIL="admin@autocentre.com"
$env:ADMIN_PASSWORD="your-strong-password"
npm run db:seed
```

---

## Verify

- CI green: `/actions` tab
- Staging: URL from **Deploy staging** workflow summary
- Production: your Vercel production URL
- Health check: `https://your-app.vercel.app/api/health`
- Admin: `https://your-app.vercel.app/admin/login`

---

## Alternative: Vercel auto-deploy from Git

If you connect the repo in Vercel, it can deploy previews on every PR and production on `main` without GitHub Actions CD. Keep GitHub CI for lint + tests + build validation.
