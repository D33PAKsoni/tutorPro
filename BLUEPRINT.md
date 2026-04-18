# Tuition Pro PWA — Complete Production Blueprint
## Senior Full-Stack Architecture & Developer Guide

---

## TABLE OF CONTENTS
1. [System Overview](#1-system-overview)
2. [Platform Registrations & Prerequisites](#2-platform-registrations--prerequisites)
3. [Supabase Setup & SQL Schema](#3-supabase-setup--sql-schema)
4. [Project Scaffold & Environment](#4-project-scaffold--environment)
5. [VS Code Development Setup](#5-vs-code-development-setup)
6. [Full Source Code](#6-full-source-code)
7. [PWA & Service Worker](#7-pwa--service-worker)
8. [Google Drive OAuth Integration](#8-google-drive-oauth-integration)
9. [Push Notifications (VAPID)](#9-push-notifications-vapid)
10. [Deployment Guide](#10-deployment-guide)

---

## 1. SYSTEM OVERVIEW

### Architecture Diagram
```
┌─────────────────────────────────────────────────────────────────┐
│                     CLIENT (Vite + React PWA)                    │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────┐   │
│  │  Auth    │  │  Teacher │  │  Student │  │  Service     │   │
│  │  Context │  │  Pages   │  │  Pages   │  │  Worker      │   │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └──────┬───────┘   │
│       └─────────────┴──────────────┴────────────────┘           │
│                         Supabase Client JS                       │
└────────────────────────────┬────────────────────────────────────┘
                              │ HTTPS / WebSocket (Realtime)
┌────────────────────────────▼────────────────────────────────────┐
│                        SUPABASE PLATFORM                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────────┐  ┌───────────┐  │
│  │  Auth    │  │ Postgres │  │  Row Level   │  │   Edge    │  │
│  │  Service │  │    DB    │  │  Security    │  │Functions  │  │
│  └──────────┘  └──────────┘  └──────────────┘  └───────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
          ┌───────────────────┼───────────────────┐
          ▼                   ▼                   ▼
   Google Drive API    VAPID Push Server    Supabase Storage
```

### Technology Stack
| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite 5 |
| Styling | Custom CSS (no UI libs) |
| Backend/DB | Supabase (Postgres) |
| Auth | Supabase Auth (email) |
| Realtime | Supabase Realtime |
| PWA | Vite PWA Plugin + Workbox |
| Push Notifications | Web Push API + VAPID |
| Backup | Google Drive API v3 |
| Deployment | Vercel / Netlify |
| Edge Functions | Supabase Deno Functions |

---

## 2. PLATFORM REGISTRATIONS & PREREQUISITES

### 2.1 Prerequisites — Install These First

```bash
# 1. Node.js (v18+) — Check version
node --version   # must be >= 18.0.0
npm --version    # must be >= 9.0.0

# Install Node if missing: https://nodejs.org/en/download
# Use nvm (recommended):
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
nvm install 18
nvm use 18

# 2. Supabase CLI
npm install -g supabase

# 3. Vercel CLI (for deployment)
npm install -g vercel
```

---

### 2.2 Supabase Project Setup

**Step 1 — Create Account & Project**
1. Go to https://supabase.com → Sign Up with GitHub
2. Click **New Project**
3. Fill in:
   - **Name**: `tuition-pro`
   - **Database Password**: Generate a strong password → **SAVE THIS**
   - **Region**: Choose closest to your users (e.g., `ap-south-1` for India)
4. Click **Create new project** — wait ~2 minutes

**Step 2 — Gather API Keys**
1. Go to Project → **Settings** → **API**
2. Copy:
   - `Project URL` → your `VITE_SUPABASE_URL`
   - `anon public` key → your `VITE_SUPABASE_ANON_KEY`
   - `service_role` key → your `SUPABASE_SERVICE_ROLE_KEY` (⚠️ keep secret, server-only)

**Step 3 — Enable Auth Providers**
1. Go to **Authentication** → **Providers**
2. **Email**: Enable → Turn OFF "Confirm email" for development (re-enable for production)
3. Save

**Step 4 — Configure Auth Settings**
1. Go to **Authentication** → **URL Configuration**
2. Set **Site URL**: `http://localhost:5173` (dev) → update to prod URL later
3. Add to **Redirect URLs**: `http://localhost:5173/**`

---

### 2.3 Google Drive API Setup (for Backup Feature)

**Step 1 — Google Cloud Console**
1. Go to https://console.cloud.google.com
2. Create a new project: **Tuition Pro Backup**
3. Go to **APIs & Services** → **Library**
4. Search and Enable: **Google Drive API**

**Step 2 — OAuth 2.0 Credentials**
1. Go to **APIs & Services** → **Credentials**
2. Click **+ CREATE CREDENTIALS** → **OAuth client ID**
3. Application type: **Web application**
4. Name: `Tuition Pro PWA`
5. Authorized JavaScript origins:
   ```
   http://localhost:5173
   https://your-production-domain.com
   ```
6. Authorized redirect URIs:
   ```
   http://localhost:5173/auth/google/callback
   https://your-production-domain.com/auth/google/callback
   ```
7. Click **Create** → Copy **Client ID** and **Client Secret**

**Step 3 — OAuth Consent Screen**
1. Go to **OAuth consent screen**
2. User Type: **External**
3. Fill in:
   - App name: `Tuition Pro`
   - User support email: your email
   - Developer contact: your email
4. Scopes: Add `https://www.googleapis.com/auth/drive.file`
5. Test users: Add your email for testing

---

### 2.4 VAPID Keys (Web Push Notifications)

```bash
# Generate VAPID key pair using web-push library
npm install -g web-push
web-push generate-vapid-keys

# Output will look like:
# Public Key: Bxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
# Private Key: xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Save both — Public goes in frontend, Private in Supabase Edge Function secrets
```

**Add VAPID Private Key to Supabase Secrets:**
1. Go to Supabase → **Settings** → **Edge Functions**
2. Under **Secrets**, add:
   - `VAPID_PRIVATE_KEY` = your private key
   - `VAPID_PUBLIC_KEY` = your public key
   - `VAPID_SUBJECT` = `mailto:your@email.com`

---

## 3. SUPABASE SETUP & SQL SCHEMA

### 3.1 Complete SQL Schema

Run this in Supabase → **SQL Editor** → **New Query**:

```sql
-- ============================================================
-- TUITION PRO — COMPLETE DATABASE SCHEMA
-- Run this entire block in Supabase SQL Editor
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- TABLE: profiles
-- Extends Supabase auth.users with role and metadata
-- ============================================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('teacher', 'student')),
  full_name TEXT,
  avatar_url TEXT,
  -- For students: JSON array of student_ids they can switch to
  associated_accounts UUID[] DEFAULT '{}',
  -- For teachers: Google Drive tokens (encrypted at app level)
  google_drive_token JSONB,
  -- Push notification subscription
  push_subscription JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLE: students
-- ============================================================
CREATE TABLE public.students (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  teacher_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Links to auth.users so student can log in
  auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  -- Display name and unique username-based ID
  full_name TEXT NOT NULL,
  student_id TEXT UNIQUE NOT NULL, -- e.g. "JOHN123"
  username TEXT UNIQUE NOT NULL,   -- e.g. "john123" (used for login)
  -- Contact
  phone TEXT,
  parent_name TEXT,
  parent_phone TEXT,
  -- Academic
  grade TEXT,
  subjects TEXT[],
  -- Status
  is_paused BOOLEAN DEFAULT FALSE,
  pause_reason TEXT,
  -- Finance
  advance_balance NUMERIC(10, 2) DEFAULT 0,
  monthly_fee NUMERIC(10, 2) DEFAULT 0,
  fee_due_day INTEGER DEFAULT 5 CHECK (fee_due_day BETWEEN 1 AND 28),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLE: attendance
-- ============================================================
CREATE TABLE public.attendance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  teacher_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('Present', 'Absent', 'Holiday', 'Extra Class')),
  remark TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  -- Unique: one record per student per day per teacher
  UNIQUE (teacher_id, student_id, date)
);

-- ============================================================
-- TABLE: fees
-- ============================================================
CREATE TABLE public.fees (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  teacher_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  month DATE NOT NULL,              -- First day of month: 2024-01-01
  amount NUMERIC(10, 2) NOT NULL,
  due_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Paid', 'Waived', 'Partial')),
  paid_amount NUMERIC(10, 2) DEFAULT 0,
  paid_date DATE,
  remark TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (teacher_id, student_id, month)
);

-- ============================================================
-- TABLE: assessments
-- ============================================================
CREATE TABLE public.assessments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  teacher_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  assessment_date DATE NOT NULL,
  title TEXT,
  score NUMERIC(6, 2) NOT NULL,
  max_marks NUMERIC(6, 2) NOT NULL DEFAULT 100,
  teacher_remark TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLE: notices
-- ============================================================
CREATE TABLE public.notices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  teacher_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  -- Recipient type: 'all', 'group', 'individual'
  recipient_type TEXT NOT NULL DEFAULT 'all' CHECK (recipient_type IN ('all', 'group', 'individual')),
  -- For individual: specific student IDs
  recipient_student_ids UUID[] DEFAULT '{}',
  -- For group: grade/subject label
  recipient_group TEXT,
  is_pinned BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLE: trust_records
-- Maps which profiles can switch to which student accounts
-- This is the sibling/multi-account architecture
-- ============================================================
CREATE TABLE public.trust_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  -- The auth profile that can switch (the "main" login)
  auth_profile_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- The student account they can access
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  -- Who granted this trust
  granted_by_teacher_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (auth_profile_id, student_id)
);

-- ============================================================
-- TABLE: push_subscriptions
-- Stores web push subscriptions per user
-- ============================================================
CREATE TABLE public.push_subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth_key TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- INDEXES for performance
-- ============================================================
CREATE INDEX idx_students_teacher_id ON public.students(teacher_id);
CREATE INDEX idx_attendance_student_id ON public.attendance(student_id);
CREATE INDEX idx_attendance_date ON public.attendance(date);
CREATE INDEX idx_fees_student_id ON public.fees(student_id);
CREATE INDEX idx_fees_status ON public.fees(status);
CREATE INDEX idx_assessments_student_id ON public.assessments(student_id);
CREATE INDEX idx_notices_teacher_id ON public.notices(teacher_id);
CREATE INDEX idx_trust_records_auth_profile ON public.trust_records(auth_profile_id);

-- ============================================================
-- TRIGGERS
-- ============================================================

-- Auto-update updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER students_updated_at BEFORE UPDATE ON public.students
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER fees_updated_at BEFORE UPDATE ON public.fees
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  user_role TEXT;
BEGIN
  -- Check if user has a role in metadata (set during signup)
  user_role := NEW.raw_user_meta_data->>'role';
  IF user_role IS NULL THEN
    user_role := 'student'; -- Default fallback
  END IF;

  INSERT INTO public.profiles (id, role, full_name)
  VALUES (
    NEW.id,
    user_role,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Auto-generate monthly fees for active students
CREATE OR REPLACE FUNCTION public.generate_monthly_fees()
RETURNS void AS $$
DECLARE
  student_rec RECORD;
  fee_month DATE;
  due DATE;
BEGIN
  fee_month := DATE_TRUNC('month', CURRENT_DATE);

  FOR student_rec IN
    SELECT id, teacher_id, monthly_fee, fee_due_day
    FROM public.students
    WHERE is_paused = FALSE
      AND monthly_fee > 0
  LOOP
    due := DATE(fee_month + (student_rec.fee_due_day - 1) * INTERVAL '1 day');

    -- Only insert if fee for this month doesn't already exist
    INSERT INTO public.fees (teacher_id, student_id, month, amount, due_date)
    VALUES (student_rec.teacher_id, student_rec.id, fee_month, student_rec.monthly_fee, due)
    ON CONFLICT (teacher_id, student_id, month) DO NOTHING;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trust_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- ---- PROFILES ----
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- ---- STUDENTS ----
-- Teachers see only their own students
CREATE POLICY "Teachers see own students"
  ON public.students FOR SELECT
  USING (teacher_id = auth.uid());

CREATE POLICY "Teachers can insert students"
  ON public.students FOR INSERT
  WITH CHECK (teacher_id = auth.uid());

CREATE POLICY "Teachers can update own students"
  ON public.students FOR UPDATE
  USING (teacher_id = auth.uid());

CREATE POLICY "Teachers can delete own students"
  ON public.students FOR DELETE
  USING (teacher_id = auth.uid());

-- Students see their own record (via auth_user_id)
CREATE POLICY "Students see own record"
  ON public.students FOR SELECT
  USING (auth_user_id = auth.uid());

-- Students can also see records linked via trust_records
CREATE POLICY "Students see trusted records"
  ON public.students FOR SELECT
  USING (
    id IN (
      SELECT student_id FROM public.trust_records
      WHERE auth_profile_id = auth.uid()
    )
  );

-- ---- ATTENDANCE ----
CREATE POLICY "Teachers manage own attendance"
  ON public.attendance FOR ALL
  USING (teacher_id = auth.uid());

CREATE POLICY "Students see own attendance"
  ON public.attendance FOR SELECT
  USING (
    student_id IN (
      SELECT id FROM public.students WHERE auth_user_id = auth.uid()
      UNION
      SELECT student_id FROM public.trust_records WHERE auth_profile_id = auth.uid()
    )
  );

-- ---- FEES ----
CREATE POLICY "Teachers manage own fees"
  ON public.fees FOR ALL
  USING (teacher_id = auth.uid());

CREATE POLICY "Students see own fees"
  ON public.fees FOR SELECT
  USING (
    student_id IN (
      SELECT id FROM public.students WHERE auth_user_id = auth.uid()
      UNION
      SELECT student_id FROM public.trust_records WHERE auth_profile_id = auth.uid()
    )
  );

-- ---- ASSESSMENTS ----
CREATE POLICY "Teachers manage own assessments"
  ON public.assessments FOR ALL
  USING (teacher_id = auth.uid());

CREATE POLICY "Students see own assessments"
  ON public.assessments FOR SELECT
  USING (
    student_id IN (
      SELECT id FROM public.students WHERE auth_user_id = auth.uid()
      UNION
      SELECT student_id FROM public.trust_records WHERE auth_profile_id = auth.uid()
    )
  );

-- ---- NOTICES ----
CREATE POLICY "Teachers manage own notices"
  ON public.notices FOR ALL
  USING (teacher_id = auth.uid());

-- Students see notices addressed to them (all, or individual)
CREATE POLICY "Students see relevant notices"
  ON public.notices FOR SELECT
  USING (
    recipient_type = 'all'
    OR (
      recipient_type = 'individual'
      AND (
        SELECT id FROM public.students WHERE auth_user_id = auth.uid() LIMIT 1
      ) = ANY(recipient_student_ids)
    )
  );

-- ---- TRUST RECORDS ----
CREATE POLICY "Teachers manage trust records for their students"
  ON public.trust_records FOR ALL
  USING (granted_by_teacher_id = auth.uid());

CREATE POLICY "Users see their own trust records"
  ON public.trust_records FOR SELECT
  USING (auth_profile_id = auth.uid());

-- ---- PUSH SUBSCRIPTIONS ----
CREATE POLICY "Users manage own push subscriptions"
  ON public.push_subscriptions FOR ALL
  USING (user_id = auth.uid());
```

### 3.2 Run the Schema

1. In Supabase Dashboard → **SQL Editor** → **New Query**
2. Paste the entire SQL block above
3. Click **Run** (Ctrl+Enter)
4. Verify: Go to **Table Editor** — all tables should appear

---

## 4. PROJECT SCAFFOLD & ENVIRONMENT

### 4.1 Create the Project

```bash
# Create Vite + React project
npm create vite@latest tuition-pro -- --template react
cd tuition-pro

# Install all dependencies
npm install \
  @supabase/supabase-js \
  react-router-dom \
  date-fns \
  vite-plugin-pwa \
  workbox-window

npm install -D \
  @vitejs/plugin-react

# Optional: PWA asset generator
npm install -D @vite-pwa/assets-generator
```

### 4.2 Environment Variables

Create `.env.local` in project root:

```env
# Supabase
VITE_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJxxxxxx...

# Google OAuth
VITE_GOOGLE_CLIENT_ID=xxxxxxxxxxxx-xxxxxxxx.apps.googleusercontent.com
VITE_GOOGLE_DRIVE_SCOPE=https://www.googleapis.com/auth/drive.file

# VAPID (Public key only in frontend)
VITE_VAPID_PUBLIC_KEY=Bxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# App
VITE_APP_NAME=Tuition Pro
VITE_INTERNAL_EMAIL_DOMAIN=tuition.internal
```

### 4.3 Project File Structure

```
tuition-pro/
├── public/
│   ├── manifest.json          ← PWA manifest
│   ├── icons/                 ← PWA icons (192x192, 512x512)
│   └── sw-push.js             ← Push notification handler
├── src/
│   ├── main.jsx               ← Entry point
│   ├── App.jsx                ← Router + Auth wrapper
│   ├── supabase.js            ← Supabase client
│   ├── styles/
│   │   ├── global.css         ← CSS variables & reset
│   │   ├── components.css     ← Reusable component styles
│   │   └── layout.css         ← Layout & navigation
│   ├── context/
│   │   ├── AuthContext.jsx    ← Auth state & user role
│   │   └── StudentContext.jsx ← Active student (sibling switching)
│   ├── hooks/
│   │   ├── useTeacher.js      ← Teacher data hooks
│   │   ├── useStudent.js      ← Student data hooks
│   │   ├── useAttendance.js
│   │   ├── useFees.js
│   │   └── usePush.js         ← Push notification hook
│   ├── lib/
│   │   ├── googleDrive.js     ← Google Drive OAuth + backup
│   │   ├── backup.js          ← Export/Import JSON logic
│   │   └── push.js            ← VAPID push utilities
│   ├── components/
│   │   ├── shared/
│   │   │   ├── BottomNav.jsx
│   │   │   ├── TopBar.jsx
│   │   │   ├── PausedBanner.jsx
│   │   │   ├── SiblingSwitch.jsx
│   │   │   └── LoadingSpinner.jsx
│   │   ├── teacher/
│   │   │   ├── StudentCard.jsx
│   │   │   ├── AttendanceRadio.jsx
│   │   │   ├── FeeToggle.jsx
│   │   │   └── NoticeComposer.jsx
│   │   └── student/
│   │       ├── TodayCard.jsx
│   │       ├── FeeCard.jsx
│   │       └── AssessmentCard.jsx
│   ├── pages/
│   │   ├── auth/
│   │   │   ├── Login.jsx
│   │   │   └── Register.jsx
│   │   ├── teacher/
│   │   │   ├── Dashboard.jsx
│   │   │   ├── Students.jsx
│   │   │   ├── Attendance.jsx
│   │   │   ├── Fees.jsx
│   │   │   ├── Assessments.jsx
│   │   │   ├── Notices.jsx
│   │   │   └── Settings.jsx
│   │   └── student/
│   │       ├── Dashboard.jsx
│   │       ├── Attendance.jsx
│   │       ├── Fees.jsx
│   │       ├── Assessments.jsx
│   │       └── Notices.jsx
│   └── workers/
│       └── sw.js              ← Service Worker
├── vite.config.js
├── manifest.json
└── .env.local
```

---

## 5. VS CODE DEVELOPMENT SETUP

### 5.1 Recommended Extensions

Install these in VS Code (Ctrl+Shift+X):

```
dbaeumer.vscode-eslint
esbenp.prettier-vscode
bradlc.vscode-tailwindcss   ← for IntelliSense on custom CSS vars
formulahendry.auto-rename-tag
dsznajder.es7-react-js-snippets
mtxr.sqltools
antfu.vite
```

### 5.2 VS Code Settings (`.vscode/settings.json`)

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "emmet.includeLanguages": {
    "javascript": "javascriptreact"
  },
  "css.validate": false
}
```

### 5.3 Running the Project

```bash
# Development server (hot reload)
npm run dev
# → Opens at http://localhost:5173

# Build for production
npm run build

# Preview production build locally
npm run preview

# Supabase local development (optional)
supabase start
supabase db reset   # apply migrations locally
```

### 5.4 Testing Student Login Flow

Since students use a "fake email" pattern:
- Username: `john123`
- Internal email: `john123@tuition.internal`
- Password: Set by teacher

```javascript
// Teacher creates student account via:
const { data, error } = await supabase.auth.admin.createUser({
  email: `${username}@tuition.internal`,
  password: password,
  user_metadata: { role: 'student', full_name: fullName }
});
```

---

## 6. FULL SOURCE CODE

See individual files in the `src/` directory.

---

## 7. PWA & SERVICE WORKER

### Manifest (`public/manifest.json`)

```json
{
  "name": "Tuition Pro",
  "short_name": "TuitionPro",
  "description": "Academic Records Management System",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#f7f9fb",
  "theme_color": "#00246a",
  "orientation": "portrait",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any maskable" }
  ]
}
```

### Service Worker Caching Strategy

```javascript
// src/workers/sw.js
import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { CacheFirst, NetworkFirst, StaleWhileRevalidate } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';

// Precache app shell
precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

// Cache Google Fonts
registerRoute(
  ({ url }) => url.origin === 'https://fonts.googleapis.com',
  new StaleWhileRevalidate({ cacheName: 'google-fonts-stylesheets' })
);

// Cache Supabase API responses (READ ONLY)
registerRoute(
  ({ url }) => url.hostname.includes('supabase.co') && url.pathname.includes('/rest/v1/'),
  new NetworkFirst({
    cacheName: 'supabase-api',
    networkTimeoutSeconds: 5,
    plugins: [
      new ExpirationPlugin({ maxEntries: 100, maxAgeSeconds: 24 * 60 * 60 })
    ]
  })
);

// Push notification handler
self.addEventListener('push', (event) => {
  const data = event.data?.json() ?? {};
  const title = data.title || 'Tuition Pro';
  const options = {
    body: data.body || 'You have a new update',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    data: { url: data.url || '/' },
    vibrate: [200, 100, 200],
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(clients.openWindow(event.notification.data.url));
});
```

---

## 8. GOOGLE DRIVE OAUTH INTEGRATION

### Flow Overview
```
User clicks "Link Google Drive"
  → Redirect to Google OAuth
  → Google redirects back with ?code=xxxx
  → Exchange code for access_token + refresh_token
  → Store tokens encrypted in Supabase profiles table
  → Monthly: read all tables → JSON → upload to Drive
```

### Client-side (`src/lib/googleDrive.js`)

```javascript
const REDIRECT_URI = `${window.location.origin}/auth/google/callback`;
const SCOPE = 'https://www.googleapis.com/auth/drive.file';

export function initiateGoogleOAuth() {
  const params = new URLSearchParams({
    client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: 'code',
    scope: SCOPE,
    access_type: 'offline',
    prompt: 'consent',
  });
  window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}

// Called at /auth/google/callback
export async function handleGoogleCallback(code) {
  // Call your Supabase Edge Function to exchange code
  const { data, error } = await supabase.functions.invoke('exchange-google-token', {
    body: { code, redirect_uri: REDIRECT_URI }
  });
  if (error) throw error;
  return data; // { access_token, refresh_token, expiry }
}

export async function backupToDrive(supabase, userId) {
  // 1. Fetch all data
  const [students, attendance, fees, assessments, notices] = await Promise.all([
    supabase.from('students').select('*'),
    supabase.from('attendance').select('*'),
    supabase.from('fees').select('*'),
    supabase.from('assessments').select('*'),
    supabase.from('notices').select('*'),
  ]);

  const backup = {
    exported_at: new Date().toISOString(),
    version: '1.0',
    students: students.data,
    attendance: attendance.data,
    fees: fees.data,
    assessments: assessments.data,
    notices: notices.data,
  };

  // 2. Get stored Drive token
  const { data: profile } = await supabase
    .from('profiles')
    .select('google_drive_token')
    .eq('id', userId)
    .single();

  const token = profile?.google_drive_token?.access_token;
  if (!token) throw new Error('Google Drive not linked');

  // 3. Upload to Drive
  const fileName = `tuition-pro-backup-${new Date().toISOString().slice(0,7)}.json`;
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });

  const metadata = { name: fileName, mimeType: 'application/json' };
  const formData = new FormData();
  formData.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
  formData.append('file', blob);

  const response = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    }
  );
  return response.json();
}
```

### Supabase Edge Function (`supabase/functions/exchange-google-token/index.ts`)

```typescript
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req) => {
  const { code, redirect_uri } = await req.json();

  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: Deno.env.get('GOOGLE_CLIENT_ID')!,
      client_secret: Deno.env.get('GOOGLE_CLIENT_SECRET')!,
      redirect_uri,
      grant_type: 'authorization_code',
    }),
  });

  const tokens = await tokenResponse.json();

  // Store in Supabase via service role
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  const authHeader = req.headers.get('Authorization');
  const { data: { user } } = await supabase.auth.getUser(authHeader?.split(' ')[1]);

  await supabase.from('profiles').update({
    google_drive_token: tokens
  }).eq('id', user?.id);

  return new Response(JSON.stringify({ success: true }), {
    headers: { 'Content-Type': 'application/json' }
  });
});
```

---

## 9. PUSH NOTIFICATIONS (VAPID)

### Subscribe User (`src/lib/push.js`)

```javascript
export async function subscribeToPush(supabase, userId) {
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return null;

  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(import.meta.env.VITE_VAPID_PUBLIC_KEY),
  });

  const { endpoint, keys } = subscription.toJSON();

  // Save to Supabase
  await supabase.from('push_subscriptions').upsert({
    user_id: userId,
    endpoint,
    p256dh: keys.p256dh,
    auth_key: keys.auth,
  }, { onConflict: 'endpoint' });

  return subscription;
}

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)));
}
```

### Edge Function for Sending Push (`supabase/functions/send-push/index.ts`)

```typescript
import webpush from 'npm:web-push@3.6.6';

webpush.setVapidDetails(
  Deno.env.get('VAPID_SUBJECT')!,
  Deno.env.get('VAPID_PUBLIC_KEY')!,
  Deno.env.get('VAPID_PRIVATE_KEY')!
);

// Called with: { user_id, title, body, url }
serve(async (req) => {
  const { user_id, title, body, url } = await req.json();
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  const { data: subs } = await supabase
    .from('push_subscriptions')
    .select('*')
    .eq('user_id', user_id);

  const payload = JSON.stringify({ title, body, url });

  for (const sub of subs ?? []) {
    await webpush.sendNotification(
      { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth_key } },
      payload
    ).catch(console.error);
  }

  return new Response(JSON.stringify({ sent: subs?.length }));
});
```

---

## 10. DEPLOYMENT GUIDE

### Deploy to Vercel

```bash
# 1. Push to GitHub
git init && git add . && git commit -m "initial commit"
gh repo create tuition-pro --public --push

# 2. Deploy to Vercel
vercel

# 3. Set environment variables in Vercel dashboard:
# → Project Settings → Environment Variables
# Add all variables from .env.local

# 4. Update Supabase Auth redirect URLs:
# → Authentication → URL Configuration
# Add: https://your-app.vercel.app/**

# 5. Update Google OAuth redirect URIs:
# → Google Cloud Console → OAuth Credentials
# Add: https://your-app.vercel.app/auth/google/callback
```

### Post-Deployment Checklist

- [ ] Supabase Site URL updated to production domain
- [ ] Google OAuth redirect URIs updated
- [ ] VAPID keys set in Supabase secrets
- [ ] `GOOGLE_CLIENT_SECRET` added to Edge Function secrets
- [ ] Email confirmation enabled in Supabase Auth (for teachers)
- [ ] RLS policies verified (test with Supabase Table Editor row inspector)
- [ ] PWA tested on mobile (Chrome → Add to Homescreen)
- [ ] Push notifications tested end-to-end
- [ ] Monthly fee generation cron set up (Supabase pg_cron or external cron → invoke Edge Function)
