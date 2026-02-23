# Monthly WhatsApp Post Planner

A Next.js 14 (App Router) TypeScript app for planning and scheduling WhatsApp posts per client on a monthly basis.

## Features

- **Clients CRUD** — Manage clients with primary approval contacts
- **Monthly Planner** — Calendar grid at `/clients/[id]/planner?month=YYYY-MM`
- **Post Editor** — Right drawer: upload poster, caption, approval time, offset days, save Draft/Schedule
- **Scheduler** — Cron every 15 min sends approval messages via Twilio WhatsApp
- **Webhooks** — Status updates and inbound button handling (Confirm / Need changes / Skip)
- **Dashboard** — Filter by status, quick actions (resend, edit, change asset)
- **Storage** — Local uploads (dev), S3/R2 (prod)

## Stack

- Next.js 14 (App Router), TypeScript, Tailwind CSS, shadcn/ui
- Prisma + PostgreSQL
- Twilio WhatsApp API
- Zod validation

## Quick Start

```bash
npm install
cp .env.example .env
```

**Set up NeonDB (free tier):**
1. Go to [console.neon.tech](https://console.neon.tech)
2. Create a project → copy the connection string
3. Paste into `.env` as `DATABASE_URL`

```bash
npm run db:migrate
npm run db:seed
npm run dev
```

## Scripts

| Command | Description |
|--------|-------------|
| `npm run dev` | Start dev server |
| `npm run build` | Production build |
| `npm run db:generate` | Generate Prisma client |
| `npm run db:migrate` | Run migrations |
| `npm run db:seed` | Seed sample data |
| `npm run db:push` | Push schema (no migrations) |

## Environment

See `.env.example` for all variables. Key ones:

- `DATABASE_URL` — PostgreSQL connection string (use `postgresql://` for Prisma 7 with pg adapter)
- `TWILIO_*` — Twilio WhatsApp credentials
- `TWILIO_MOCK_MODE=true` — Skip real Twilio in dev
- `S3_*` — For production file storage (R2/S3)

## Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for Vercel, Postgres, Twilio, and cron setup.
