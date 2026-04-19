// src/context/AuthContext.jsx

import { createContext, useContext, useEffect, useState } from 'react';
import { supabase, toInternalEmail } from '../supabase';

const AuthContext = createContext(null);

// Profile fetch with timeout on BOTH the initial query AND the retry
async function fetchProfileForUser(userId) {
  async function attempt() {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();
    if (error) throw error;
    return data;
  }

  function withTimeout(promise, ms) {
    return Promise.race([
      promise,
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('timeout')), ms)
      ),
    ]);
  }

  try {
    const data = await withTimeout(attempt(), 5000);
    // Row genuinely missing — retry once (new user trigger delay)
    if (!data) {
      await new Promise(r => setTimeout(r, 1000));
      return await withTimeout(attempt(), 5000);
    }
    return data;
  } catch (e) {
    console.error('[AuthContext] fetchProfile:', e.message);
    // Return undefined (not null) to signal "fetch failed" vs "no row"
    return undefined;
  }
}

export function AuthProvider({ children }) {
  const [session,  setSession]  = useState(null);
  const [profile,  setProfile]  = useState(null);
  // profileError: true = fetch failed (show retry), false = no error
  const [profileError, setProfileError] = useState(false);
  const [loading,  setLoading]  = useState(true);

  async function loadProfile(userId) {
    setProfileError(false);
    const result = await fetchProfileForUser(userId);
    if (result === undefined) {
      // Network/timeout failure — show retry screen
      setProfile(null);
      setProfileError(true);
    } else {
      setProfile(result); // null = no row, object = profile found
      setProfileError(false);
    }
  }

  useEffect(() => {
    let mounted = true;

    async function init() {
      // getSession reads from localStorage instantly.
      // Wrap in timeout in case token refresh hangs.
      const sessionResult = await Promise.race([
        supabase.auth.getSession(),
        new Promise(resolve =>
          setTimeout(() => resolve({ data: { session: null }, timedOut: true }), 6000)
        ),
      ]);

      if (!mounted) return;

      if (sessionResult.timedOut) {
        setSession(null);
        setLoading(false);
        return;
      }

      const s = sessionResult.data?.session ?? null;
      setSession(s);

      if (s?.user) await loadProfile(s.user.id);

      if (mounted) setLoading(false);
    }

    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        if (!mounted) return;
        if (event === 'INITIAL_SESSION') return;

        setSession(newSession ?? null);

        if (newSession?.user) {
          await loadProfile(newSession.user.id);
        } else {
          setProfile(null);
          setProfileError(false);
        }

        if (mounted) setLoading(false);
      }
    );

    return () => { mounted = false; subscription.unsubscribe(); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const refreshProfile = async () => {
    if (!session?.user) return;
    await loadProfile(session.user.id);
  };

  return (
    <AuthContext.Provider value={{
      session,
      user:        session?.user ?? null,
      profile,
      profileError,
      isTeacher:   profile?.role === 'teacher',
      isStudent:   profile?.role === 'student',
      loading,
      registerTeacher: ({ email, password, fullName }) =>
        supabase.auth.signUp({ email, password, options: { data: { role: 'teacher', full_name: fullName } } }),
      loginTeacher: ({ email, password }) =>
        supabase.auth.signInWithPassword({ email, password }),
      loginStudent: ({ username, password }) =>
        supabase.auth.signInWithPassword({ email: toInternalEmail(username), password }),
      signOut: async () => {
        await supabase.auth.signOut();
        setProfile(null);
        setSession(null);
        setProfileError(false);
      },
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
