# Tuition Pro PWA

A production-ready **Progressive Web App** for managing tuition records — attendance, fees, assessments, and notices. Built with **React + Vite + Supabase**. No UI libraries — pure custom CSS following the "Academic Precision" design system.

---

## Features

### Teacher
- Register with email, log in, manage all data
- Dashboard with live stats (active students, pending fees, today's attendance)
- **Students**: Add/edit/delete, pause/resume accounts, set monthly fee & due day
- **Attendance**: Radio-button list for daily marking (Present / Absent / Holiday / Extra Class). Paused students automatically excluded
- **Fees**: Monthly fee generation, paid/unpaid toggle, advance balance tracking (manual reference)
- **Assessments**: Record subject scores with teacher remarks
- **Notices**: Broadcast to All / Group / Individual students, with pin support
- **Backup**: Google Drive OAuth integration + local JSON export/import
- **Push Notifications**: VAPID-based alerts for overdue fees & new notices

### Student
- Log in with a username (no email required)
- "Today's View" dashboard: today's attendance, overdue fee alerts, recent notices
- Full history: Attendance (monthly), Fees (view-only, no ledger), Assessments (subject tabs + grade display), Notices (accordion)
- **Account Paused**: Persistent banner shown, historical records still accessible
- **Sibling Switching**: Switch between multiple linked student accounts with zero re-authentication
- **Advance Balance** visible (deposit reference only)

### PWA
- Installable on iOS and Android (Add to Homescreen)
- Offline-capable with Workbox caching
- Web Push Notifications via VAPID
- Safe-area / bottom nav pill aware

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite 5 |
| Styling | Custom CSS (no Tailwind/Bootstrap) |
| Backend / DB | Supabase (PostgreSQL + Auth + Realtime) |
| Edge Functions | Supabase Deno Functions |
| PWA | vite-plugin-pwa + Workbox |
| Push | Web Push API + VAPID keys |
| Backup | Google Drive API v3 (OAuth 2.0) |
| Deployment | Vercel |

---

## Quick Start

### 1. Install prerequisites

```bash
node --version   # must be >= 18
npm --version    # must be >= 9
```

### 2. Clone and install

```bash
git clone https://github.com/YOUR_USERNAME/tuition-pro.git
cd tuition-pro
npm install
```

### 3. Set up Supabase

1. Create a project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** → paste and run the full schema from `BLUEPRINT.md` section 3.1
3. Go to **Settings → API** and copy your `Project URL` and `anon public` key

### 4. Configure environment variables

```bash
cp .env.local.example .env.local
# Edit .env.local and fill in your values
```

Required variables:
```
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
VITE_GOOGLE_CLIENT_ID=xxxx.apps.googleusercontent.com
VITE_VAPID_PUBLIC_KEY=Bxxxx...
VITE_INTERNAL_EMAIL_DOMAIN=tuition.internal
```

### 5. Deploy Edge Functions

```bash
npm install -g supabase
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase functions deploy create-student-user
supabase functions deploy exchange-google-token
supabase functions deploy send-push
supabase functions deploy monthly-cron
```

Add secrets to Supabase Edge Functions (Settings → Edge Functions → Secrets):
```
VAPID_PRIVATE_KEY=your_private_key
VAPID_PUBLIC_KEY=your_public_key
VAPID_SUBJECT=mailto:your@email.com
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
```

### 6. Run locally

> ⚠️ **Important — Edge Functions**: The "Create Student" feature calls the
>  Supabase Edge Function. You must serve it locally,
> and your  **must** use the local Supabase URL, not the cloud URL.

```bash
# Terminal 1 — start local Supabase (DB + Auth + Edge runtime)
supabase start
# Note the "anon key" printed — use it as VITE_SUPABASE_ANON_KEY in .env.local

# Terminal 2 — serve edge functions (required for student creation)
supabase functions serve

# Terminal 3 — start the Vite dev server
npm run dev
# → http://localhost:5173
```

**In `.env.local`, set:**
```
VITE_SUPABASE_URL=http://localhost:54321   # ← local URL, NOT the cloud *.supabase.co URL
VITE_SUPABASE_ANON_KEY=<key from supabase start output>
```

If `VITE_SUPABASE_URL` points to the cloud project while running locally, the app
cannot reach the edge function and you will see **"failed to communicate with edge function"**.

---

## Student Login Architecture

Students use a **username-based login** (no email needed). Internally, their credentials are stored as `username@tuition.internal` to satisfy Supabase Auth requirements.

```
Teacher creates student with username: "john123"
→ Supabase auth email: "john123@tuition.internal"
→ Student logs in by typing: "john123" (app appends domain)
```

Teachers create student accounts via the **`create-student-user` Edge Function** (which uses the service role key to bypass email confirmation).

---

## Sibling Switching

Multiple student profiles can be linked to a single login via the `trust_records` table:

```sql
-- Teacher links siblings in the DB
INSERT INTO trust_records (auth_profile_id, student_id, granted_by_teacher_id)
VALUES ('<main_login_uid>', '<sibling_student_id>', '<teacher_uid>');
```

The `StudentContext` fetches all linked accounts on login, and `SiblingSwitch` lets students toggle between them in a bottom sheet — **no re-authentication required**.

---

## Project Structure

```
src/
├── context/        AuthContext, StudentContext
├── hooks/          useTeacher, useStudent, useAttendance, useFees, usePush
├── lib/            googleDrive, backup, push
├── components/
│   ├── shared/     TopBar, BottomNav, PausedBanner, SiblingSwitch, LoadingSpinner
│   ├── teacher/    StudentCard, AttendanceRadio, FeeToggle, NoticeComposer
│   └── student/    TodayCard, FeeCard, AssessmentCard
├── pages/
│   ├── auth/       Login, Register, GoogleCallback
│   ├── teacher/    Dashboard, Students, Attendance, Fees, Assessments, Notices, Settings
│   └── student/    Dashboard, Attendance, Fees, Assessments, Notices
├── styles/         global.css, components.css, layout.css
└── workers/        sw.js (Workbox service worker)
supabase/functions/
├── create-student-user/
├── exchange-google-token/
├── send-push/
└── monthly-cron/
```

---

## Deployment (Vercel)

```bash
npm install -g vercel
vercel
```

After deploying:
1. Set all env variables in Vercel Dashboard → Project → Settings → Environment Variables
2. Update Supabase **Site URL** to your Vercel domain
3. Add your Vercel domain to **Redirect URLs** in Supabase Auth settings
4. Update Google OAuth **Authorized redirect URIs** to include `https://your-app.vercel.app/auth/google/callback`
5. Enable email confirmation for teachers (Supabase Auth → Providers → Email)

---

## Monthly Fee Cron

To auto-generate fees and send overdue push notifications on the 1st of every month, run this SQL in Supabase:

```sql
SELECT cron.schedule(
  'monthly-fee-generation',
  '0 9 1 * *',
  $$
  SELECT net.http_post(
    url := 'https://YOUR_PROJECT.supabase.co/functions/v1/monthly-cron',
    headers := '{"Authorization": "Bearer YOUR_CRON_SECRET"}'::jsonb
  )
  $$
);
```

---

## Design System

The UI follows the **"Academic Precision"** design language from the reference files:

- **Colors**: Deep scholar blues (`#00246a`) + intellectual slates, with tertiary reds for alerts
- **Typography**: Manrope (display/headings) + Inter (body/data)
- **No-Line Rule**: Sections separated by background color shifts, not borders
- **Tonal Architecture**: Layered surface colors create depth without shadows
- **INR Protocol**: ₹ symbol always styled at a lower opacity than the number
- **Safe Area**: `env(safe-area-inset-bottom)` keeps content clear of mobile nav pills

---

## License

MIT
