# Site monitoring and alerting

Date: 2026-08-18  
Status: approved in conversation; waiting for spec review before implementation  
Site: https://autogalaxy.in  
Alert email: mr.abhaysachan@gmail.com

## Goal

Watch Auto Galaxy 24/7. When availability, errors, latency, traffic, Vercel usage, or the database cross agreed thresholds, email a report that includes **what failed** and a **suggested action**. Notify the Cursor agent through a scheduled check whose failing run is the agent signal. Show the same report on the existing Cloud Vitals admin page.

This is not a new SaaS product and not a Cursor-only watcher.

## Architecture

Two watchers, one report format.

1. **GitHub Actions every 5 minutes (primary clock)**  
   Pings `https://autogalaxy.in/` and `https://autogalaxy.in/api/health` with a 5s timeout.  
   - If the site is down, slow, or returns 5xx: send email from GitHub Actions (outside Vercel). Do not wait on in-app mail.  
   - If the site responds: `POST` `/api/ops/health-check` with `CRON_SECRET` so the app can evaluate 5xx rate, API jumps, functions, traffic, usage, and database.

   GitHub Actions is the primary scheduler so Hobby-plan Vercel cron limits (once per day) cannot leave the site unwatched.

2. **Vercel cron (backup + daily digest)**  
   - `GET` `/api/ops/health-check` every 15 minutes when the Vercel plan allows it.  
   - On Hobby, run once daily at 03:30 UTC (09:00 IST) as the digest even if 15-minute cron is unavailable.  
   - If GitHub Actions is late, this still evaluates in-app signals while Vercel is up.

3. **Cursor schedule (hourly)**  
   Cloud agent fetches the same health report. A failing run is how the coding agent is notified. The agent does not replace email.

Each health-check run sends **at most one alert email**, listing every signal that is new, upgraded, or recovered in that run. The same open signal is omitted until 45 minutes have passed unless severity rises (warning → critical). Daily digest at 09:00 IST always sends, healthy or not.

## Report format

Every email, Cloud Vitals panel, and Cursor check uses the same rows:

- Signal name  
- Current value and threshold  
- Severity: `ok` | `warning` | `critical`  
- Suggested action (required, never empty on warning/critical)  
- Links: Cloud Vitals, Vercel dashboard, Neon console  

Subject lines:

- `[Auto Galaxy] CRITICAL: <signal>`  
- `[Auto Galaxy] WARNING: <signal>`  
- `[Auto Galaxy] Recovered: <signal>`  
- `[Auto Galaxy] Daily health digest`

Body includes the row list plus overall status. Recovered emails include the action that was suggested while it was failing, plus “no further action unless it returns.”

## Signals and thresholds

| Signal id | Warning | Critical | Suggested action |
|-----------|---------|----------|------------------|
| `availability` | Timeout, non-2xx, or no response on one check | Down on 2 consecutive checks | Check the latest Vercel deployment and DNS for autogalaxy.in. Confirm `/api/health`. |
| `response_time` | Homepage or `/api/health` > 3s | > 5s | Check Neon latency on Cloud Vitals, then Vercel function duration and cold starts. |
| `http_5xx` | 5xx > 2% of sampled requests in the last 15 minutes | > 5% | Open Vercel function logs for 5xx. Roll back the last deploy if the spike started then. |
| `api_errors` | 4xx+5xx on `/api/*` ~3× vs the previous hour | ~5× | Identify the failing route group from the snapshot. Check database, auth, and env for that route. |
| `function_failures` | 5xx on API/function routes ~3× vs the previous hour | ~5× sustained | Inspect that function in Vercel. Redeploy or raise memory/timeout if duration is maxed. |
| `traffic_spike` | Last hour visits ~3× the median of the same hour over the last 7 days | ~5× | Watch Vercel and Neon limits. Pause ads or campaigns if usage is also high. |
| `vercel_usage` | Any tracked quota ≥ 80% | ≥ 95% | Upgrade the Vercel plan or cut bandwidth / function duration. Skip this signal if `VERCEL_API_TOKEN` is unset (status `ok`, detail “usage API not configured”). |
| `database` | Latency ≥ 300ms or connections ≥ 80% of `max_connections`, or error rate elevated | Unreachable, latency ≥ 1500ms, connections ≥ 95%, or query errors high | Check Neon status, pooling (`DATABASE_URL` pooler), and connection limit. Restart compute only if Neon shows idle-fail. |

Existing Cloud Vitals thresholds for DB latency, heap, and web vitals stay as they are (`src/lib/system-health.ts`). They appear on the snapshot. Email only the table above plus those existing items when they are already `warning` or `critical` (same suggested actions already produced by `buildRecommendations`).

Spike factor uses integer counts. If the baseline hour has fewer than 20 events, do not fire `api_errors` / `function_failures` / `traffic_spike` (avoid false alarms on tiny samples). Availability and response time always fire.

## Components

### Request buckets (no personal data)

Next.js middleware records HTML document and `/api/*` requests only. Static assets, Next internals, and `/_next/` are ignored.

Store **per-minute aggregates**, not one row per request:

- `minute` (UTC truncated)  
- `routeGroup` (`/` for pages, first two segments for APIs e.g. `/api/bookings`)  
- `statusClass` (`2xx`, `4xx`, `5xx`)  
- `count`  
- `totalDurationMs`

No bodies, query strings, cookies, IPs, phones, or emails.

Retention: delete buckets older than 8 days on each health-check run.

### Snapshot job

`POST` or `GET` `/api/ops/health-check`  
Header: `Authorization: Bearer <CRON_SECRET>`  
Unauthorized → 401.

The job:

1. Pings origin homepage and `/api/health` (skip self-ping loop: when the caller is GitHub Actions, the workflow already pinged; the in-app job still pings so Vercel cron has the same data).  
2. Reads minute buckets (15-minute and 60-minute windows).  
3. Reuses `collectSystemHealthReport()` for DB latency, visits, web vitals.  
4. Queries `pg_stat_activity` count and `SHOW max_connections`.  
5. Optionally fetches Vercel usage.  
6. Evaluates signals; writes `HealthSnapshot`.  
7. Opens/updates/closes `HealthAlert` rows.  
8. Sends email when policy allows (new, severity up, recovered, or digest).

Source field on the snapshot: `github-actions` | `vercel-cron` | `manual`.

### Alert state

One open row per `signal` id.

- New breach → insert open alert; include in this run’s email.  
- Still open, same severity, last email < 45 minutes → omit from email.  
- Still open, severity rose → include immediately; update `lastSentAt`.  
- Back to ok → mark recovered; include in this run’s recovered section; keep row for history.  
- If several signals are due, they share one email (mixed warning/critical/recovered sections).  
- Mail failure → snapshot and alert still persist; next run retries if `lastSentAt` is still due.

### Cloud Vitals UI

Same `/admin/cloud-vitals` page. Add a block:

- Overall status and generated time  
- Open alerts with suggested actions  
- Last snapshot signals table  
- Last 24 hourly snapshots as a simple status list  

Do not add a new admin nav item.

### Email

Add `nodemailer` as a direct dependency. Send through SMTP:

- `SMTP_HOST` (default `smtp.gmail.com`)  
- `SMTP_PORT` (default `465`)  
- `SMTP_USER`  
- `SMTP_PASS` (Gmail app password)  
- `ALERT_EMAIL` (default `mr.abhaysachan@gmail.com`)  
- `ALERT_FROM` (default `SMTP_USER`)

If SMTP env is missing, skip send and record `emailSkipped: "smtp_not_configured"` on the snapshot. Never throw out of the job.

GitHub Actions uses the same SMTP secrets from GitHub repository secrets for **site down** mail when the health-check endpoint cannot be reached.

### GitHub Actions

New workflow `.github/workflows/site-health.yml`:

- Cron: `*/5 * * * *` plus `workflow_dispatch`  
- Steps: curl homepage and `/api/health` with 5s max time.  
- If either fails: send site-down email via a small Node script (`scripts/send-health-alert.mjs`) using SMTP secrets.  
- If both succeed: `POST` `{NEXTAUTH_URL}/api/ops/health-check` with `CRON_SECRET`.  
- Do not fail the whole CI product pipeline; this workflow is isolated from `ci.yml`.

### Vercel

`vercel.json` crons:

- `/api/ops/health-check` every 15 minutes (`*/15 * * * *`) when the account allows it  
- Digest: same route with `?digest=1` at `30 3 * * *` (09:00 IST)

The route treats `digest=1` as “evaluate + always email digest.”

### Cursor notification

After deploy, create a Cursor Automation (hourly cron) whose instructions are: GET Cloud Vitals/health-check summary (or public status if documented), if overall is warning/critical fail the run with the suggested-action list so the agent is notified. Email remains the human path. This automation is opened in the Automations editor after the in-app work ships; it is not a substitute for GitHub Actions.

## Data model

```
HealthMinuteBucket
  id, minute, routeGroup, statusClass, count, totalDurationMs
  @@unique([minute, routeGroup, statusClass])

HealthSnapshot
  id, createdAt, source, overallStatus, payload Json

HealthAlert
  id, signal, severity, state (open|recovered),
  openedAt, lastSeenAt, lastSentAt, recoveredAt,
  title, detail, suggestedAction, fingerprint
  @@index([signal, state])
```

`payload` is the full report JSON (signals, recommendations, environment). Keep snapshots 30 days.

## Error handling

- Health-check is read-only except snapshots, alerts, bucket upserts, and retention deletes.  
- Each collector (Vercel API, `pg_stat_activity`, ping) is isolated: failure sets that signal to `warning` with action “collector failed, retry next run” and continues.  
- Middleware bucket writes are fire-and-forget; a DB error must not change the user response.  
- Cron secret missing in production logs an error at boot of the route and returns 401 for all callers.

## Tests

Vitest, no live network:

- Threshold helpers: 2%/5% 5xx, 3s/5s latency, 3×/5× spikes, skip spikes when baseline < 20.  
- Suggested action string is present for every warning/critical signal id.  
- Dedupe: second evaluation within 45 minutes does not mark `shouldEmail`.  
- Severity upgrade emails immediately.  
- Recovery marks `recovered` and `shouldEmail`.  
- Site-down vs site-up-but-DB-down produce different signal sets and actions.  
- Digest flag forces email even when all ok.

## Out of scope

- Slack, WhatsApp, or SMS  
- Paging / on-call rotations  
- Storing request bodies or visitor PII in buckets  
- Auto-rollback of deploys  
- Replacing Cloud Vitals with a new product area  

## Environment

Production (Vercel + GitHub Actions secrets):

- `CRON_SECRET`  
- `SMTP_HOST` `SMTP_PORT` `SMTP_USER` `SMTP_PASS`  
- `ALERT_EMAIL`  
- `NEXTAUTH_URL` (https://autogalaxy.in)  
- Optional `VERCEL_API_TOKEN` and `VERCEL_TEAM_ID` / `VERCEL_PROJECT_ID` for usage %

## Success

- Site down emails Abhay within one 5-minute GitHub Actions cycle even if Vercel cron cannot run.  
- In-app signals email with suggested actions when the site is up.  
- Cloud Vitals shows open alerts and last snapshot.  
- No email flood for a single ongoing issue.  
- Cursor hourly automation can fail a run with the same action list.
