# Premier Auto Centre

Full-stack automobile sales and service centre website built with **Next.js**, **React**, **Tailwind CSS**, **Prisma**, **PostgreSQL**, and **NextAuth**.

## Features

- Public site: vehicle inventory, services, service booking, test drive requests, contact
- Admin panel: manage vehicles, bookings, inquiries, and services
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
- Email: `admin@autocentre.com`
- Password: value of `ADMIN_PASSWORD` in `.env` (default in `.env.example`)

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run build:prod` | Migrate DB + build (used in CI/production) |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run db:up` | Start local Postgres (Docker) |
| `npm run db:down` | Stop local Postgres |
| `npm run db:migrate` | Create/apply dev migrations |
| `npm run db:migrate:deploy` | Apply migrations (production/CI) |
| `npm run db:seed` | Seed sample data |
| `npm run db:reset` | Reset database and re-seed |

## CI/CD

- **CI**: `.github/workflows/ci.yml` — lint, migrate, build on every push/PR
- **CD (Vercel)**: `.github/workflows/deploy-vercel.yml` — deploy to production
- **CD (Docker)**: `.github/workflows/deploy-docker.yml` — push image to GHCR

See **[DEPLOYMENT.md](./DEPLOYMENT.md)** for full production setup (Neon, Vercel, secrets, seeding).

## Environment Variables

Copy `.env.example` to `.env`:

```env
DATABASE_URL="postgresql://autocentre:autocentre@localhost:5432/autocentre?schema=public"
NEXTAUTH_SECRET="your-secret"
AUTH_SECRET="your-secret"
NEXTAUTH_URL="http://localhost:3000"
ADMIN_EMAIL="admin@autocentre.com"
ADMIN_PASSWORD="change-me-in-production"
```

## Health Check

```text
GET /api/health
```

Returns `{ "status": "ok" }` when the database is reachable.
