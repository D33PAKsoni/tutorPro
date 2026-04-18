-- =============================================================
-- supabase/migrations/fix_profiles_trigger.sql
--
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- This fixes the infinite loader caused by missing profile rows.
-- =============================================================


-- ── 1. Profiles table (create if not exists) ──────────────────
CREATE TABLE IF NOT EXISTS public.profiles (
  id                UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role              TEXT NOT NULL CHECK (role IN ('teacher', 'student')),
  full_name         TEXT,
  google_drive_token JSONB,
  associated_accounts UUID[],
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);


-- ── 2. Drop and recreate the trigger function ─────────────────
-- (Safe to run multiple times)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_role TEXT;
  user_name TEXT;
BEGIN
  -- Read role from user_metadata set during signUp / admin.createUser
  user_role := COALESCE(NEW.raw_user_meta_data->>'role', 'student');
  user_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    split_part(NEW.email, '@', 1)   -- fallback: username part of email
  );

  INSERT INTO public.profiles (id, role, full_name)
  VALUES (NEW.id, user_role, user_name)
  ON CONFLICT (id) DO NOTHING;    -- idempotent: won't error if row already exists

  RETURN NEW;
END;
$$;


-- ── 3. Attach trigger to auth.users ──────────────────────────
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();


-- ── 4. Back-fill profiles for any existing users who have none ─
-- (Fixes teachers who already registered before the trigger existed)
INSERT INTO public.profiles (id, role, full_name)
SELECT
  u.id,
  COALESCE(u.raw_user_meta_data->>'role', 'teacher'),
  COALESCE(u.raw_user_meta_data->>'full_name', split_part(u.email, '@', 1))
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL;              -- only insert for users who have no profile yet


-- ── 5. RLS Policies for profiles ─────────────────────────────
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop first so re-running this script is safe
DROP POLICY IF EXISTS "Users can view own profile"   ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);


-- ── 6. Verify ─────────────────────────────────────────────────
-- Run this SELECT to confirm all auth users now have a profile row:
-- SELECT u.id, u.email, p.role, p.full_name
-- FROM auth.users u
-- LEFT JOIN public.profiles p ON p.id = u.id
-- ORDER BY u.created_at DESC;
