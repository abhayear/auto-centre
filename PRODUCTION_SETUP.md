# Production Setup — Copy-Paste Guide

Follow these steps in order. Your repo is already on GitHub and CI is passing.

---

## STEP 1 — Neon (PostgreSQL) ~5 min

1. Open **https://console.neon.tech/signup** and sign in (GitHub login works).
2. Click **New Project**
   - Name: `auto-centre-prod`
   - Region: pick closest to you (e.g. `US East`)
3. On the project dashboard, open **Connection details**
4. Select **Prisma** or **URI** and copy the connection string.
5. It should look like:
   ```
   postgresql://neondb_owner:XXXX@ep-xxxx.us-east-1.aws.neon.tech/neondb?sslmode=require
   ```
6. **Save this URL** — you need it for Vercel and seeding.

> If `?sslmode=require` is missing, add it to the end of the URL.

---

## STEP 2 — Vercel (hosting) ~10 min

1. Open **https://vercel.com/new**
2. Sign in with **GitHub**
3. Click **Import** next to **`abhayear/auto-centre`**
4. Before clicking Deploy, expand **Environment Variables** and add ALL of these:

| Name | Value |
|------|--------|
| `DATABASE_URL` | *(paste Neon URL from Step 1)* |
| `NEXTAUTH_SECRET` | *(generate: `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`)*
| `AUTH_SECRET` | *(same value as NEXTAUTH_SECRET)*
| `NEXTAUTH_URL` | `https://autogalaxy.in`
| `ADMIN_EMAIL` | `admin@autogalaxy.in` |
| `ADMIN_PASSWORD` | *(choose a strong password — used only for seeding)*

### Monitoring and alerting environment variables

| Name | Value |
|------|--------|
| `CRON_SECRET` | random 32+ byte string |
| `SMTP_HOST` | `smtp.gmail.com` |
| `SMTP_PORT` | `465` |
| `SMTP_USER` | Gmail address |
| `SMTP_PASS` | Gmail app password |
| `ALERT_EMAIL` | `mr.abhaysachan@gmail.com` |
| `VERCEL_API_TOKEN` | optional, for usage % |
| `VERCEL_TEAM_ID` | optional |
| `VERCEL_PROJECT_ID` | optional |

`CRON_SECRET` must exist in the Vercel project environment. Vercel then
automatically sends `Authorization: Bearer $CRON_SECRET` with cron requests, as
required by the protected operations endpoint.

5. **Framework Preset:** Next.js (auto-detected)
6. **Build Command:** leave default (`npm run build:prod` from vercel.json)
7. Click **Deploy**
8. Wait ~2–3 minutes for the build to finish.
9. Copy your live URL (e.g. `https://auto-centre-xxxxx.vercel.app`)

### Fix NEXTAUTH_URL after first deploy

1. Vercel → your project → **Settings** → **Environment Variables**
2. Edit `NEXTAUTH_URL` to your **exact** Vercel URL (with `https://`)
3. **Redeploy** (Deployments → ⋯ → Redeploy)

### Scheduled health monitoring

Vercel runs the daily digest at 03:30 UTC (`/api/ops/health-check?digest=1`).
Frequent probes (every 5 minutes) come from the GitHub Actions
`site-health.yml` workflow — Vercel Hobby only allows one cron job per day.

Add `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, and `CRON_SECRET` as
GitHub repository secrets. Add the GitHub repository variable `NEXTAUTH_URL`
with the value `https://autogalaxy.in`.

After deployment, create a Cursor automation that runs every hour with these
instructions:

> GET `https://autogalaxy.in/api/health`. If the response is non-200, fail the
> run and include the suggested action from the availability row. A 200
> response completes the availability check.

Do not put `CRON_SECRET` or SMTP passwords in a Cursor automation prompt. The
automation uses the public health endpoint only; it must not call the protected
operations endpoint.

---

## STEP 3 — Seed production database ~2 min

Run in PowerShell (replace `NEON_URL` with your real connection string):

```powershell
cd C:\Users\akshay\projects\auto-centre
$env:DATABASE_URL="NEON_URL"
$env:ADMIN_EMAIL="admin@autogalaxy.in"
$env:ADMIN_PASSWORD="YOUR_STRONG_PASSWORD"
npm run db:seed
```

You should see: `Seed completed successfully.`

---

## STEP 4 — Verify

| Check | URL |
|-------|-----|
| Public site | `https://YOUR-APP.vercel.app` |
| Health | `https://YOUR-APP.vercel.app/api/health` → `"status":"ok"` |
| Admin login | `https://YOUR-APP.vercel.app/admin/login` |

**Login:** use the `ADMIN_EMAIL` and `ADMIN_PASSWORD` you set in Step 2.

---

## Auto-deploy from Git (already configured)

Every push to `master` on GitHub will:
1. Run **CI** on GitHub Actions (lint + build)
2. Trigger a **new Vercel deployment** automatically

No GitHub Actions CD secrets needed for Option A.

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Vercel build fails on migrate | Check `DATABASE_URL` is set in Vercel env vars |
| Admin login fails | Re-run seed script with correct `DATABASE_URL` |
| Health returns 503 | Neon project paused? Wake it in Neon console |
| Auth redirect loop | Set `NEXTAUTH_URL` to exact production URL and redeploy |

---

## Security reminder

Change `ADMIN_PASSWORD` after first login by re-seeding with a new password, or update in Neon SQL console.

Delete or rotate the secrets in this file once setup is complete if you commit it.
