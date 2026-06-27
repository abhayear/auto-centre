# Auto Galaxy

Electric 2-wheeler sales and service website for **Auto Galaxy**, Lalitpur — built with **Next.js**, **React**, **Tailwind CSS**, **Prisma**, **PostgreSQL**, and **NextAuth**.

## Features

- Public site: e-scooter inventory, services, service booking, test ride requests, contact, careers
- Admin panel: manage vehicles, bookings, inquiries, services, and job postings
- Authentication-protected admin routes
- CI/CD via GitHub Actions
- Production-ready for Vercel or Docker

## Getting Started

### Prerequisites

- Node.js 20+
- Docker Desktop (for local PostgreSQL)

### Setup

```powershell
cd auto-centre
npm install
npm run db:up
copy .env.example .env
npm run db:migrate:deploy
npm run db:seed
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) for the public site.

### Admin Login

- URL: [http://localhost:3000/admin/login](http://localhost:3000/admin/login)
- Email: `admin@autogalaxy.in` (or value of `ADMIN_EMAIL` in `.env`)
- Password: value of `ADMIN_PASSWORD` in `.env` (default in `.env.example`)

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run build:prod` | Migrate DB + build (used in CI/production) |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm test` | Run unit tests (Vitest) |
| `npm run test:watch` | Run tests in watch mode |
| `npm run test:coverage` | Run tests with coverage report |
| `npm run db:up` | Start local Postgres (Docker) |
| `npm run db:down` | Stop local Postgres |
| `npm run db:migrate` | Create/apply dev migrations |
| `npm run db:migrate:deploy` | Apply migrations (production/CI) |
| `npm run db:seed` | Seed sample data |
| `npm run db:reset` | Reset database and re-seed |

## CI/CD & Branching

| Branch | CI | Deploy |
|--------|-----|--------|
| `feature/*` | On PR to `develop` | — |
| `develop` | ✅ | Staging (Vercel preview + Docker `:staging`) |
| `main` / `master` | ✅ | Production (Vercel + Docker `:latest`) |

- **CI**: `.github/workflows/ci.yml` — lint, unit tests, migrate, build
- **Staging CD**: `.github/workflows/deploy-staging.yml` — push to `develop`
- **Production CD**: `.github/workflows/deploy-vercel.yml` — push to `main`/`master`
- **Docker CD**: `.github/workflows/deploy-docker.yml` — branch-based tags

See **[BRANCHING.md](./BRANCHING.md)** and **[CI_CD.md](./CI_CD.md)** for the full workflow.
See **[DEPLOYMENT.md](./DEPLOYMENT.md)** for production setup (Neon, Vercel, secrets, seeding).

## Environment Variables

Copy `.env.example` to `.env`:

```env
DATABASE_URL="postgresql://autocentre:autocentre@localhost:5433/autocentre?schema=public"
NEXTAUTH_SECRET="your-secret"
AUTH_SECRET="your-secret"
NEXTAUTH_URL="http://localhost:3000"
ADMIN_EMAIL="admin@autogalaxy.in"
ADMIN_PASSWORD="change-me-in-production"
```

## Health Check

```text
GET /api/health
```

Returns `{ "status": "ok" }` when the database is reachable.
