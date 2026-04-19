// src/context/AuthContext.jsx

import { createContext, useContext, useEffect, useState } from 'react';
import { supabase, toInternalEmail } from '../supabase';

const AuthContext = createContext(null);

// ── Profile cache (localStorage) ────────────────────────────────────────────
// Persisting the profile means that on a revisit the app loads it
// instantly from cache, avoiding the "Could not load your profile" screen
// that appears when the Supabase fetch times out on slow connections.
const PROFILE_CACHE_KEY = 'tuition_pro_profile_cache';

function getCachedProfile(userId) {
  try {
    const raw = localStorage.getItem(PROFILE_CACHE_KEY);
    if (!raw) return null;
    const cached = JSON.parse(raw);
    // Only use cache if it belongs to the current user
    if (cached?.id === userId) return cached;
    return null;
  } catch {
    return null;
  }
}

function setCachedProfile(profile) {
  try {
    if (profile) localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(profile));
    else localStorage.removeItem(PROFILE_CACHE_KEY);
  } catch { /* quota exceeded or private mode — silently ignore */ }
}

async function fetchProfileForUser(userId) {
  const query = supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  // Increase timeout — 4s was too tight on mobile/slow connections
  const timeout = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('profile_timeout')), 8000)
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

  // Helper: set profile in state + keep cache in sync
  function applyProfile(p) {
    setProfile(p);
    setCachedProfile(p);
  }

  useEffect(() => {
    let mounted = true;

    async function init() {
      const sessionPromise = supabase.auth.getSession();
      const sessionTimeout = new Promise(resolve =>
        setTimeout(() => resolve({ data: { session: null }, timedOut: true }), 8000)
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
        // ── KEY FIX: load from cache immediately so the UI never flashes
        // the "Could not load your profile" screen on revisit.
        const cached = getCachedProfile(s.user.id);
        if (cached && mounted) {
          setProfile(cached);
          setLoading(false); // unblock UI right away with cached data
        }

        // Always re-fetch in background to keep profile fresh
        fetchProfileForUser(s.user.id).then(fresh => {
          if (!mounted) return;
          if (fresh) applyProfile(fresh);
          // If fetch fails but we already have cached data, keep it —
          // don't show the retry screen just because of a transient error.
          else if (!cached) setProfile(null);
          setLoading(false);
        });

        // If no cache, leave loading=true until fetch completes (set above)
        if (cached) return; // loading already set to false
      } else {
        // No session — clear stale cache
        setCachedProfile(null);
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
          // Show cached profile immediately while fresh data loads
          const cached = getCachedProfile(newSession.user.id);
          if (cached && mounted) setProfile(cached);

          const p = await fetchProfileForUser(newSession.user.id);
          if (mounted) {
            if (p) applyProfile(p);
            else if (!cached) setProfile(null);
          }
        } else {
          setCachedProfile(null);
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
    setCachedProfile(null);
    setProfile(null);
    setSession(null);
  };

  const refreshProfile = async () => {
    if (!session?.user) return;
    const p = await fetchProfileForUser(session.user.id);
    if (p) applyProfile(p);
    else setProfile(p); // null — don't cache
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
