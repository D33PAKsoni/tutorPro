// src/context/AuthContext.jsx

import { createContext, useContext, useEffect, useState } from 'react';
import { supabase, toInternalEmail } from '../supabase';

const AuthContext = createContext(null);

// Fetch profile with a hard 4-second timeout so a slow/hanging DB query
// never keeps the app in the loading state permanently.
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
    // Row missing — trigger may not have fired yet, retry once after 1s
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
  const [session, setSession] = useState(undefined); // undefined = not yet known
  const [profile, setProfile] = useState(null);
  const [loading, setLoading]  = useState(true);

  useEffect(() => {
    let mounted = true;

    async function init() {
      // ── getSession() reads localStorage first. If token is expired it makes
      //    a refresh network call. We wrap with a 6s timeout so a hanging
      //    network call can never keep loading=true forever.
      const sessionPromise = supabase.auth.getSession();
      const sessionTimeout = new Promise(resolve =>
        setTimeout(() => resolve({ data: { session: null }, timedOut: true }), 6000)
      );

      const result = await Promise.race([sessionPromise, sessionTimeout]);

      if (!mounted) return;

      if (result.timedOut) {
        // Network hung — clear loading and show login so user can re-auth
        console.warn('[AuthContext] getSession timed out');
        setSession(null);
        setLoading(false);
        return;
      }

      const s = result.data?.session ?? null;
      setSession(s);

      if (s?.user) {
        const p = await fetchProfileForUser(s.user.id);
        if (mounted) setProfile(p);
      }

      if (mounted) setLoading(false);
    }

    init();

    // onAuthStateChange handles events AFTER the initial load:
    // SIGNED_IN, SIGNED_OUT, TOKEN_REFRESHED, PASSWORD_RECOVERY, USER_UPDATED
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        if (!mounted) return;

        // Skip the initial event — init() already handled it
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
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { role: 'teacher', full_name: fullName } },
    });
    return { data, error };
  };

  const loginTeacher = async ({ email, password }) => {
    return supabase.auth.signInWithPassword({ email, password });
  };

  const loginStudent = async ({ username, password }) => {
    const email = toInternalEmail(username);
    return supabase.auth.signInWithPassword({ email, password });
  };

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

  // loading=true only while we haven't finished the init() call
  // session=undefined means init hasn't run yet (shouldn't reach guards)
  const value = {
    session: session ?? null,
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
