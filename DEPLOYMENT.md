# Deployment Notes: Monthly WhatsApp Post Planner

## Stack

- **Framework**: Next.js 14 (App Router)
- **Database**: PostgreSQL (Prisma)
- **Hosting**: Vercel
- **Cron**: Vercel Cron (every 15 min)
- **Storage**: Local (dev) / S3-compatible R2 (prod)

---

## 1. Database Setup

### Option A: Vercel Postgres / Neon / Supabase

1. Create a PostgreSQL database.
2. Copy the connection string (e.g. `postgresql://user:pass@host:5432/db?sslmode=require`).
3. Set `DATABASE_URL` in your environment.

**Note:** Prisma 7 requires the `@prisma/adapter-pg` adapter with a standard `postgresql://` URL. Prisma Postgres (`prisma+postgres://`) URLs are not supported by the pg adapter; use a standard PostgreSQL provider instead.

### Option B: Prisma Postgres (local)

```bash
npx prisma dev
```

This starts a local Postgres and sets `DATABASE_URL` in `.env`.

### Migrations

```bash
npm run db:migrate
npm run db:seed   # Optional: seed one client with a full month
```

---

## 2. Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `TWILIO_ACCOUNT_SID` | Prod | Twilio account SID |
| `TWILIO_AUTH_TOKEN` | Prod | Twilio auth token |
| `TWILIO_WHATSAPP_FROM` | Prod | WhatsApp sender (e.g. `whatsapp:+14155238886`) |
| `TWILIO_MOCK_MODE` | Dev | Set to `true` to skip real Twilio calls |
| `CRON_SECRET` | Prod | Secret for cron auth (Vercel sets `CRON_SECRET` automatically) |
| `S3_*` | Prod | S3/R2 credentials for file storage |
| `UPLOAD_DIR` | Dev | Local upload path (default: `./public/uploads`) |

---

## 3. Twilio WhatsApp Setup

1. Create a [Twilio](https://www.twilio.com) account.
2. Enable WhatsApp Sandbox or use a WhatsApp Business API number.
3. Configure webhooks:
   - **Status callback**: `https://your-domain.com/api/twilio/status`
   - **Inbound**: `https://your-domain.com/api/twilio/inbound`
4. Create an approved template with quick reply buttons (Confirm / Need changes / Skip tomorrow) if using template messages.

---

## 4. Storage (S3/R2 for Production)

### Cloudflare R2

1. Create an R2 bucket.
2. **Enable CORS** for direct uploads: R2 bucket → Settings → CORS policy. Add:
   ```json
   [
     {
       "AllowedOrigins": ["*"],
       "AllowedMethods": ["GET", "PUT", "HEAD"],
       "AllowedHeaders": ["*"],
       "ExposeHeaders": ["ETag"],
       "MaxAgeSeconds": 3600
     }
   ]
   ```
   Or for your domain only: `"AllowedOrigins": ["https://your-app.vercel.app"]`
3. Set env vars:
   - `S3_ENDPOINT`: R2 endpoint URL
   - `S3_REGION`: `auto`
   - `S3_ACCESS_KEY`, `S3_SECRET_KEY`: R2 API tokens
   - `S3_BUCKET`: bucket name
   - `STORAGE_PUBLIC_URL`: public URL for the bucket (if using public access)

### AWS S3

Use standard S3 env vars; `S3_ENDPOINT` can be omitted for AWS.

---

## 5. Vercel Deployment

1. Push to GitHub and connect the repo to Vercel.
2. Add environment variables in the Vercel dashboard.
3. Deploy. Vercel will:
   - Run `prisma generate` during build
   - Run migrations if configured (or run manually)
   - Schedule the cron at `/api/cron/scheduler` every 15 minutes

### Build Command

```bash
npm run build
```

Ensure `prisma generate` runs (it’s part of the Postinstall script if configured).

### Cron

The `vercel.json` cron runs every 15 minutes. Vercel sends `Authorization: Bearer <CRON_SECRET>`. Set `CRON_SECRET` in Vercel env vars (or rely on the default).

---

## 6. Manual Cron Trigger

For testing without waiting for the schedule:

```bash
curl -H "Authorization: Bearer YOUR_CRON_SECRET" \
  https://your-domain.com/api/cron/scheduler
```

---

## 7. Local Development

```bash
# Install deps
npm install

# Set up .env (copy from .env.example)
cp .env.example .env

# Use Prisma Postgres or any Postgres
npx prisma migrate dev
npm run db:seed

# Run dev server
npm run dev
```

- `TWILIO_MOCK_MODE=true`: Twilio calls are logged, not sent.
- Local uploads go to `./public/uploads`.
