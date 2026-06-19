# Production Deployment Guide

This guide covers CI/CD and production hosting for **Premier Auto Centre**.

## Architecture

```text
GitHub (push/PR)
    │
    ├─► CI workflow ──► lint + migrate + build (Postgres service)
    │
    ├─► Deploy Vercel ──► Next.js app + managed Postgres (Neon recommended)
    │
    └─► Deploy Docker ──► GHCR image (Railway / Fly.io / AWS / Azure)
```

---

## 1. Prerequisites

- GitHub repository for this project
- Production PostgreSQL database ([Neon](https://neon.tech), [Supabase](https://supabase.com), or [Railway](https://railway.app))
- (Recommended) [Vercel](https://vercel.com) account for Next.js hosting

---

## 2. Local development with PostgreSQL

The app uses **PostgreSQL** in all environments (SQLite is no longer used).

```powershell
# Start local Postgres
npm run db:up

# Copy env template and adjust if needed
copy .env.example .env

# Run migrations + seed
npm run db:migrate:deploy
npm run db:seed

# Start dev server
npm run dev
```

Stop Postgres: `npm run db:down`

---

## 3. CI pipeline (GitHub Actions)

Workflow: [`.github/workflows/ci.yml`](.github/workflows/ci.yml)

Runs on every push/PR to `main` or `master`:

1. ESLint
2. `prisma migrate deploy` against a CI Postgres container
3. `next build`

No secrets required for CI.

---

## 4. Production option A — Vercel (recommended)

### Step 1: Create Postgres

1. Create a Neon (or Supabase) project
2. Copy the connection string (must include `?sslmode=require` for Neon)

### Step 2: Create Vercel project

1. Import your GitHub repo in Vercel
2. Framework preset: **Next.js**
3. Set environment variables in Vercel → Settings → Environment Variables:

| Variable | Value |
|----------|--------|
| `DATABASE_URL` | `postgresql://...?sslmode=require` |
| `NEXTAUTH_SECRET` | Random 32+ char string |
| `AUTH_SECRET` | Same as `NEXTAUTH_SECRET` |
| `NEXTAUTH_URL` | `https://your-domain.vercel.app` |
| `ADMIN_EMAIL` | Your admin email |
| `ADMIN_PASSWORD` | Strong password (seed only) |

4. Deploy once from the Vercel dashboard (or push to `main`)

Build command (also in `vercel.json`):

```bash
npm run build:prod
```

This runs `prisma migrate deploy` before `next build`.

### Step 3: Seed production database (one time)

From your machine with production `DATABASE_URL`:

```powershell
$env:DATABASE_URL="postgresql://..."
$env:ADMIN_EMAIL="admin@yourdomain.com"
$env:ADMIN_PASSWORD="your-strong-password"
npm run db:seed
```

Or use Neon's SQL console — seed is optional if you add data via admin UI.

### Step 4: GitHub Actions CD (optional)

Workflow: [`.github/workflows/deploy-vercel.yml`](.github/workflows/deploy-vercel.yml)

Add GitHub repository secrets:

| Secret | How to get it |
|--------|----------------|
| `VERCEL_TOKEN` | Vercel → Account Settings → Tokens |
| `VERCEL_ORG_ID` | `vercel link` or project settings |
| `VERCEL_PROJECT_ID` | `vercel link` or project settings |

Create a GitHub **environment** named `production` (Settings → Environments) for approval gates if desired.

---

## 5. Production option B — Docker

Workflow: [`.github/workflows/deploy-docker.yml`](.github/workflows/deploy-docker.yml)

Builds and pushes to **GitHub Container Registry**:

```text
ghcr.io/<your-org>/<your-repo>:latest
```

### Run container

```bash
docker run -p 3000:3000 \
  -e DATABASE_URL="postgresql://..." \
  -e NEXTAUTH_SECRET="..." \
  -e AUTH_SECRET="..." \
  -e NEXTAUTH_URL="https://your-domain.com" \
  ghcr.io/<your-org>/<your-repo>:latest
```

The container runs `prisma migrate deploy` on startup, then starts the Next.js server.

### Railway / Fly.io

1. Connect GitHub repo or GHCR image
2. Set the same environment variables as Vercel
3. Expose port `3000`

---

## 6. Health check

After deploy, verify:

```text
GET https://your-domain.com/api/health
```

Expected: `{ "status": "ok", ... }`

---

## 7. Security checklist

- [ ] Use strong `NEXTAUTH_SECRET` / `AUTH_SECRET` (never commit to git)
- [ ] Use strong `ADMIN_PASSWORD` and change default after first seed
- [ ] Set `NEXTAUTH_URL` to your exact production URL (with `https`)
- [ ] Enable SSL on Postgres (`sslmode=require`)
- [ ] Restrict admin routes; consider IP allowlisting for `/admin` in production
- [ ] Rotate secrets if `.env` was ever exposed

---

## 8. Troubleshooting

| Issue | Fix |
|-------|-----|
| Build fails on migrate | Ensure `DATABASE_URL` is set in Vercel/host env |
| Admin login fails | Re-run seed with correct `ADMIN_EMAIL` / `ADMIN_PASSWORD` |
| Images 404 | Update vehicle image URLs in admin panel |
| CI fails on Postgres | Check workflow logs; Postgres service must be healthy before migrate |

---

## 9. Manual deploy commands

```powershell
npm ci
npm run db:migrate:deploy
npm run build
npm start
```

Production build with migrations:

```powershell
npm run build:prod
```
