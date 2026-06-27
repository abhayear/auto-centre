# Branching & Deployment Strategy

This project uses a **Git Flow–lite** model with automated CI on every branch and environment-specific CD.

## Branch model

```text
feature/* ──PR──► develop ──PR──► main (or master)
                     │              │
                     ▼              ▼
                  Staging       Production
```

| Branch | Purpose | CI | Deploy target |
|--------|---------|-----|---------------|
| `feature/*` | New work | ✅ on PR to `develop` | — (preview via Vercel Git integration) |
| `develop` | Integration / staging | ✅ push + PR | **Staging** (Vercel preview + Docker `:staging`) |
| `main` / `master` | Production releases | ✅ push + PR | **Production** (Vercel prod + Docker `:latest`) |

## Workflow files

| Workflow | File | Trigger | What it does |
|----------|------|---------|--------------|
| **CI** | `.github/workflows/ci.yml` | Push/PR → `main`, `master`, `develop` | Lint → unit tests → migrate → build |
| **Deploy staging** | `.github/workflows/deploy-staging.yml` | Push → `develop` | Vercel preview deploy |
| **Deploy production** | `.github/workflows/deploy-vercel.yml` | Push → `main`/`master` | Vercel production deploy |
| **Deploy Docker** | `.github/workflows/deploy-docker.yml` | Push → `develop` / `main` | GHCR `:staging` or `:latest` |

## Typical developer flow

1. Create a feature branch from `develop`:
   ```bash
   git checkout develop
   git pull
   git checkout -b feature/add-vehicle-filters
   ```

2. Develop locally and run checks:
   ```bash
   npm run lint
   npm test
   npm run build
   ```

3. Open a PR into `develop` — CI must pass before merge.

4. After merge to `develop`, staging deploy runs automatically (requires Vercel secrets).

5. When staging is verified, open a PR from `develop` → `main` and merge to release to production.

## GitHub environments

Create two environments under **Settings → Environments**:

| Environment | Branch rule | Optional |
|-------------|-------------|----------|
| `staging` | `develop` only | Required reviewers optional |
| `production` | `main` / `master` only | **Recommended:** require approval before deploy |

Both environments use the same Vercel secrets (`VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`). Configure separate env vars in Vercel for Preview vs Production (different `DATABASE_URL`, `NEXTAUTH_URL`, etc.).

## Testing

| Command | Description |
|---------|-------------|
| `npm test` | Run all unit tests once |
| `npm run test:watch` | Watch mode during development |
| `npm run test:coverage` | Run tests with coverage report |

Tests live in `src/**/*.test.ts`. CI runs `npm test` on every push and PR.

## Vercel branch settings (recommended)

In Vercel → Project → Settings → Git:

- **Production Branch:** `main` (or `master`)
- Enable **Preview Deployments** for all branches
- Optionally assign a stable preview URL to `develop` via Vercel's branch alias

## Docker tags

| Tag | Source branch | Use |
|-----|---------------|-----|
| `:staging` | `develop` | Staging hosts (Railway, Fly.io, etc.) |
| `:latest` | `main` / `master` | Production |
| `:sha-…` | Any push | Pin to a specific commit |

## Branch protection (recommended)

For `main` / `master`:

- Require PR before merge
- Require CI status checks (`Lint and unit tests`, `Migrate and build`)
- No direct pushes

For `develop`:

- Require PR before merge (from feature branches)
- Require CI status check
