// src/context/AuthContext.jsx
// Manages Supabase session, user role, and teacher/student profile

import { createContext, useContext, useEffect, useState } from 'react';
import { supabase, toInternalEmail } from '../supabase';

const AuthContext = createContext(null);

// ── fetchProfile ──────────────────────────────────────────────────────────
// Reads the profile row for a given userId.
// maybeSingle() returns null (not an error) when no row found.
// Retries once after 1s to handle trigger propagation delay on new signups.
async function fetchProfileForUser(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    console.error('[AuthContext] fetchProfile:', error.message);
    return null;
  }

  if (!data) {
    // Trigger may not have inserted the row yet — wait 1s and retry once
    await new Promise(r => setTimeout(r, 1000));
    const { data: retry, error: retryErr } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();
    if (retryErr) {
      console.error('[AuthContext] fetchProfile retry:', retryErr.message);
      return null;
    }
    return retry ?? null;
  }

  return data;
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    // ── STEP 1: getSession() reads from localStorage — instant, no network ──
    // This is the correct Supabase JS v2 bootstrap pattern.
    // It unblocks the UI immediately on refresh without waiting for any
    // server round-trip. loading becomes false as soon as profile is fetched.
    supabase.auth.getSession().then(async ({ data: { session: s } }) => {
      if (!mounted) return;
      setSession(s);
      if (s?.user) {
        const p = await fetchProfileForUser(s.user.id);
        if (mounted) setProfile(p);
      }
      if (mounted) setLoading(false);
    });

    // ── STEP 2: onAuthStateChange handles login / logout / token refresh ───
    // We skip INITIAL_SESSION here because Step 1 already handled bootstrap.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        if (!mounted) return;

        // INITIAL_SESSION fires right after getSession() on mount.
        // Skip it — Step 1 already owns the initial load.
        if (event === 'INITIAL_SESSION') return;

        setSession(newSession);

        if (newSession?.user) {
          const p = await fetchProfileForUser(newSession.user.id);
          if (mounted) setProfile(p);
        } else {
          setProfile(null);
        }

        // Ensure loading is always cleared (safety net)
        if (mounted) setLoading(false);
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // ── Teacher registration ──────────────────────────────────────────────
  const registerTeacher = async ({ email, password, fullName }) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { role: 'teacher', full_name: fullName } },
    });
    return { data, error };
  };

  // ── Teacher login ─────────────────────────────────────────────────────
  const loginTeacher = async ({ email, password }) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    return { data, error };
  };

  // ── Student login (username → internal email) ─────────────────────────
  const loginStudent = async ({ username, password }) => {
    const email = toInternalEmail(username);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    return { data, error };
  };

  // ── Sign out ──────────────────────────────────────────────────────────
  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setSession(null);
  };

  // ── Refresh profile (call after profile update) ───────────────────────
  const refreshProfile = async () => {
    if (!session?.user) return;
    const p = await fetchProfileForUser(session.user.id);
    setProfile(p);
  };

  const value = {
    session,
    user: session?.user ?? null,
    profile,
    isTeacher: profile?.role === 'teacher',
    isStudent: profile?.role === 'student',
    loading,
    registerTeacher,
    loginTeacher,
    loginStudent,
    signOut,
    refreshProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
