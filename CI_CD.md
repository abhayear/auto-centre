# CI/CD Setup Guide

Repository: **https://github.com/abhayear/auto-centre**

## Pipeline overview

| Workflow | File | Trigger | Purpose |
|----------|------|---------|---------|
| **CI** | `.github/workflows/ci.yml` | Push/PR to `master` | Lint → migrate → build |
| **Deploy Vercel** | `.github/workflows/deploy-vercel.yml` | Manual | Deploy to production |
| **Deploy Docker** | `.github/workflows/deploy-docker.yml` | Manual | Push image to GHCR |

View runs: **https://github.com/abhayear/auto-centre/actions**

---

## Step 1 — CI (automatic)

CI runs on every push. No secrets required.

It uses a temporary Postgres container, runs migrations, lint, and build.

**Status:** Should pass after the latest lint fixes are pushed.

---

## Step 2 — Production database (Neon)

1. Create account at [neon.tech](https://neon.tech)
2. New project → copy **connection string**
3. Ensure URL includes `?sslmode=require`

---

## Step 3 — Vercel project

1. [vercel.com](https://vercel.com) → **Add New Project**
2. Import **`abhayear/auto-centre`**
3. Add environment variables (Production):

```
DATABASE_URL=postgresql://...?sslmode=require
NEXTAUTH_SECRET=<random-32+-chars>
AUTH_SECRET=<same-as-above>
NEXTAUTH_URL=https://your-app.vercel.app
ADMIN_EMAIL=admin@yourdomain.com
ADMIN_PASSWORD=<strong-password>
```

4. Deploy once from Vercel dashboard

---

## Step 4 — GitHub secrets (for automated deploy)

Go to: **https://github.com/abhayear/auto-centre/settings/secrets/actions**

Add these secrets:

| Secret | How to get it |
|--------|----------------|
| `VERCEL_TOKEN` | Vercel → Account Settings → [Tokens](https://vercel.com/account/tokens) |
| `VERCEL_ORG_ID` | Run locally after `vercel link`: `cat .vercel/project.json` |
| `VERCEL_PROJECT_ID` | Same file as above |

Create environment (optional): **Settings → Environments → New → `production`**

---

## Step 5 — Run CD manually

After secrets are set:

1. Open **https://github.com/abhayear/auto-centre/actions**
2. Click **Deploy to Vercel**
3. Click **Run workflow** → **Run workflow**

---

## Step 6 — Seed production database

```powershell
cd C:\Users\akshay\projects\auto-centre
$env:DATABASE_URL="your-neon-url"
$env:ADMIN_EMAIL="admin@autocentre.com"
$env:ADMIN_PASSWORD="your-strong-password"
npm run db:seed
```

---

## Verify

- CI green: `/actions` tab
- Live site: your Vercel URL
- Health check: `https://your-app.vercel.app/api/health`
- Admin: `https://your-app.vercel.app/admin/login`

---

## Alternative: Vercel auto-deploy from Git

Skip GitHub Actions CD entirely — connect the repo in Vercel and it deploys on every push to `master` automatically. CI still runs on GitHub for quality checks.
