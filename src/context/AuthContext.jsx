// src/context/AuthContext.jsx
// Manages Supabase session, user role, and teacher/student profile

import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { supabase, toInternalEmail } from '../supabase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession]   = useState(null);
  const [profile, setProfile]   = useState(null);
  const [loading, setLoading]   = useState(true);
  // Track in-flight profile fetch so we never call setLoading(false) before it lands
  const fetchingRef = useRef(false);

  // ── fetchProfile ────────────────────────────────────────────────────────
  // Returns the profile (or null) and surfaces errors instead of swallowing them.
  const fetchProfile = useCallback(async (userId) => {
    fetchingRef.current = true;
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();          // maybeSingle() returns null (not an error) when no row found

      if (error) {
        console.error('[AuthContext] fetchProfile error:', error.message);
        // RLS block or network error — treat as "no profile" so the app doesn't
        // spin forever; user will be redirected to login by RequireAuth
        setProfile(null);
        return null;
      }

      // If no profile row exists yet (trigger didn't fire or first-render race),
      // wait 800 ms and retry once before giving up.
      if (!data) {
        await new Promise(r => setTimeout(r, 800));
        const { data: retryData, error: retryErr } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .maybeSingle();

        if (retryErr) {
          console.error('[AuthContext] fetchProfile retry error:', retryErr.message);
          setProfile(null);
          return null;
        }
        setProfile(retryData ?? null);
        return retryData ?? null;
      }

      setProfile(data);
      return data;
    } finally {
      fetchingRef.current = false;
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    // ── Bootstrap: read persisted session from storage first ──────────────
    // onAuthStateChange fires INITIAL_SESSION synchronously on mount with the
    // stored session, so we rely on that as the single source of truth and
    // only use getSession() as a fallback for environments where the listener
    // fires late (some SSR / React-strict-double-invoke scenarios).

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        if (!mounted) return;

        setSession(newSession);

        if (newSession?.user) {
          await fetchProfile(newSession.user.id);
        } else {
          setProfile(null);
        }

        // Only mark loading done after profile is settled
        if (mounted) setLoading(false);
      }
    );

    // Safety net: if onAuthStateChange never fires (edge case), unblock the UI
    const timeout = setTimeout(() => {
      if (mounted && fetchingRef.current === false) setLoading(false);
    }, 5000);

    return () => {
      mounted = false;
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, [fetchProfile]);

  // Teacher registration (email + password)
  const registerTeacher = async ({ email, password, fullName }) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { role: 'teacher', full_name: fullName },
      },
    });
    return { data, error };
  };

  // Teacher login
  const loginTeacher = async ({ email, password }) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    return { data, error };
  };

  // Student login (username → fake email)
  const loginStudent = async ({ username, password }) => {
    const email = toInternalEmail(username);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    return { data, error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setSession(null);
  };

  const refreshProfile = () => {
    if (session?.user) fetchProfile(session.user.id);
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
