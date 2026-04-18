# Tuition Pro — Deployment Guide

## 1. Prerequisites

```bash
npm install -g supabase
supabase login
```

---

## 2. Environment Variables

Copy `.env.local.example` to `.env.local` and fill in all values:

```bash
cp .env.local.example .env.local
```

| Variable | Where to get it |
|---|---|
| `VITE_SUPABASE_URL` | Supabase Dashboard → Project Settings → API |
| `VITE_SUPABASE_ANON_KEY` | Supabase Dashboard → Project Settings → API |
| `VITE_GOOGLE_CLIENT_ID` | Google Cloud Console → OAuth 2.0 Credentials |
| `VITE_GOOGLE_DRIVE_SCOPE` | Use `https://www.googleapis.com/auth/drive.file` |
| `VITE_VAPID_PUBLIC_KEY` | Generate below |

Generate VAPID keys:
```bash
npx web-push generate-vapid-keys
```

---

## 3. Deploy Edge Functions

This is the most common cause of the "Could not reach edge function" error.
**Functions are NOT auto-deployed — you must run this every time you change them.**

```bash
# Link your project first (one-time)
supabase link --project-ref YOUR_PROJECT_REF

# Deploy all functions
supabase functions deploy create-student-user
supabase functions deploy exchange-google-token
supabase functions deploy send-push
supabase functions deploy monthly-cron
```

---

## 4. Set Function Secrets (Hosted Supabase)

Edge functions on Supabase hosted need secrets set separately from your `.env.local`.
Run these once (or update them in Dashboard → Edge Functions → Secrets):

```bash
# Required for all functions
supabase secrets set SUPABASE_URL=https://YOUR_PROJECT.supabase.co
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Google Drive backup (optional — skip if not using Drive)
supabase secrets set GOOGLE_CLIENT_ID=your_google_client_id
supabase secrets set GOOGLE_CLIENT_SECRET=your_google_client_secret

# Push notifications (optional — skip if not using push)
supabase secrets set VAPID_SUBJECT=mailto:you@yourdomain.com
supabase secrets set VAPID_PUBLIC_KEY=your_vapid_public_key
supabase secrets set VAPID_PRIVATE_KEY=your_vapid_private_key

# Cron job protection (any random string)
supabase secrets set CRON_SECRET=$(openssl rand -hex 32)
```

Verify secrets are set:
```bash
supabase secrets list
```

---

## 5. Run Database Migrations

Apply the SQL schema from `BLUEPRINT.md` (Section 1) in the Supabase SQL Editor,
or via CLI:

```bash
supabase db push
```

---

## 6. Local Development

```bash
# Terminal 1 — Supabase local stack
supabase start
supabase functions serve --env-file supabase/functions/.env.local

# Terminal 2 — Vite dev server
npm install
npm run dev
```

Your `.env.local` for local dev should have:
```
VITE_SUPABASE_URL=http://localhost:54321
VITE_SUPABASE_ANON_KEY=<anon key from `supabase status`>
```

---

## 7. Deploy to Vercel

```bash
# Build first to verify no errors
npm run build

# Deploy via Vercel CLI
npx vercel --prod
```

Add all `VITE_*` variables in Vercel Dashboard → Project → Settings → Environment Variables.

> **Note:** Supabase Edge Functions run on Supabase's servers, NOT on Vercel.
> Vercel only hosts the React frontend. The functions must still be deployed
> via `supabase functions deploy` as described in step 3.

---

## 8. Verify Everything Works

1. Open the app and register as a teacher
2. Go to Students → Add Student — this calls `create-student-user`
3. If you see "Could not reach the edge function", check:
   - `supabase functions deploy create-student-user` was run
   - `supabase secrets list` shows `SUPABASE_SERVICE_ROLE_KEY`
   - Dashboard → Edge Functions → `create-student-user` shows as Active
