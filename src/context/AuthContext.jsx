// src/context/AuthContext.jsx

import { createContext, useContext, useEffect, useState } from 'react';
import { supabase, toInternalEmail } from '../supabase';

const AuthContext = createContext(null);

async function fetchProfileForUser(userId) {
  const query = supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  const timeout = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('profile_timeout')), 4000)
  );

  try {
    const { data, error } = await Promise.race([query, timeout]);
    if (error) {
      console.error('[AuthContext] fetchProfile:', error.message);
      return null;
    }
    // Row missing — retry once after 1s (trigger propagation delay)
    if (!data) {
      await new Promise(r => setTimeout(r, 1000));
      const { data: retry } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();
      return retry ?? null;
    }
    return data;
  } catch (e) {
    console.error('[AuthContext] fetchProfile failed/timed out:', e.message);
    return null;
  }
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function init() {
      const sessionPromise = supabase.auth.getSession();
      const sessionTimeout = new Promise(resolve =>
        setTimeout(() => resolve({ data: { session: null }, timedOut: true }), 6000)
      );

      const result = await Promise.race([sessionPromise, sessionTimeout]);
      if (!mounted) return;

      if (result.timedOut) {
        console.warn('[AuthContext] getSession timed out');
        setSession(null);
        setLoading(false);
        return;
      }

      const s = result.data?.session ?? null;
      setSession(s);

      if (s?.user) {
        const p = await fetchProfileForUser(s.user.id);
        // ── KEY FIX ──────────────────────────────────────────────────────
        // If profile is null here it does NOT mean the trigger is missing.
        // It can mean the profile fetch timed out or had a transient network
        // error. We must NOT redirect to login with the scary "profile_missing"
        // warning in this case — the session IS valid. We set profile to null
        // and let the app proceed; RequireAuth will show the page if session
        // is valid, and the profile will be re-fetched on next interaction.
        if (mounted) setProfile(p);
      }

      if (mounted) setLoading(false);
    }

    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        if (!mounted) return;
        if (event === 'INITIAL_SESSION') return;

        setSession(newSession ?? null);

        if (newSession?.user) {
          const p = await fetchProfileForUser(newSession.user.id);
          if (mounted) setProfile(p);
        } else {
          setProfile(null);
        }

        if (mounted) setLoading(false);
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const registerTeacher = async ({ email, password, fullName }) => {
    return supabase.auth.signUp({
      email, password,
      options: { data: { role: 'teacher', full_name: fullName } },
    });
  };

  const loginTeacher = ({ email, password }) =>
    supabase.auth.signInWithPassword({ email, password });

  const loginStudent = ({ username, password }) =>
    supabase.auth.signInWithPassword({ email: toInternalEmail(username), password });

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setSession(null);
  };

  const refreshProfile = async () => {
    if (!session?.user) return;
    const p = await fetchProfileForUser(session.user.id);
    setProfile(p);
  };

  return (
    <AuthContext.Provider value={{
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
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
