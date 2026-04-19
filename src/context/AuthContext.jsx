// src/context/AuthContext.jsx

import { createContext, useContext, useEffect, useState } from 'react';
import { supabase, toInternalEmail } from '../supabase';

const AuthContext = createContext(null);

// ── Profile cache ────────────────────────────────────────────────────────────
// Cache the profile in localStorage so that on revisit the UI loads
// instantly from cache while a background refresh keeps it up to date.
const CACHE_KEY = 'tuition-pro-profile';

function readCache(userId) {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const obj = JSON.parse(raw);
    return obj?.id === userId ? obj : null;
  } catch { return null; }
}

function writeCache(profile) {
  try {
    if (profile) localStorage.setItem(CACHE_KEY, JSON.stringify(profile));
    else localStorage.removeItem(CACHE_KEY);
  } catch { /* quota / private mode — ignore */ }
}

async function fetchProfile(userId) {
  try {
    const { data, error } = await Promise.race([
      supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
      new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 8000)),
    ]);
    if (error) throw error;
    // Retry once — profile row may not exist yet due to trigger propagation
    if (!data) {
      await new Promise(r => setTimeout(r, 1200));
      const { data: retry } = await supabase
        .from('profiles').select('*').eq('id', userId).maybeSingle();
      return retry ?? null;
    }
    return data;
  } catch (e) {
    console.warn('[AuthContext] fetchProfile:', e.message);
    return null;
  }
}

export function AuthProvider({ children }) {
  const [session, setSession]   = useState(null);
  const [profile, setProfile]   = useState(null);
  const [loading, setLoading]   = useState(true);

  function applyProfile(p) {
    setProfile(p);
    writeCache(p);
  }

  useEffect(() => {
    let mounted = true;

    async function init() {
      // supabase-js with implicit flow reads the token from localStorage
      // synchronously — getSession() is near-instant on revisit.
      const { data: { session: s } } = await supabase.auth.getSession();
      if (!mounted) return;

      setSession(s ?? null);

      if (s?.user) {
        // 1. Load cached profile immediately — zero flicker on revisit
        const cached = readCache(s.user.id);
        if (cached) {
          setProfile(cached);
          setLoading(false); // unblock the UI right away
        }

        // 2. Always refresh from DB in background
        fetchProfile(s.user.id).then(fresh => {
          if (!mounted) return;
          if (fresh) {
            applyProfile(fresh);
          } else if (!cached) {
            // Fresh fetch failed AND no cache → show retry screen
            setProfile(null);
          }
          // If fresh is null but we have a cache, keep the cache — don't
          // blank the screen due to a transient network error.
          setLoading(false);
        });

        if (cached) return; // loading already set false above
      } else {
        writeCache(null); // clear stale cache on sign-out / no session
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
          const cached = readCache(newSession.user.id);
          if (cached) setProfile(cached);

          fetchProfile(newSession.user.id).then(fresh => {
            if (!mounted) return;
            if (fresh) applyProfile(fresh);
            else if (!cached) setProfile(null);
            setLoading(false);
          });
          if (cached) return;
        } else {
          writeCache(null);
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

  const registerTeacher = ({ email, password, fullName }) =>
    supabase.auth.signUp({
      email, password,
      options: { data: { role: 'teacher', full_name: fullName } },
    });

  const loginTeacher = ({ email, password }) =>
    supabase.auth.signInWithPassword({ email, password });

  const loginStudent = ({ username, password }) =>
    supabase.auth.signInWithPassword({ email: toInternalEmail(username), password });

  const signOut = async () => {
    await supabase.auth.signOut();
    writeCache(null);
    setProfile(null);
    setSession(null);
  };

  const refreshProfile = async () => {
    if (!session?.user) return;
    const p = await fetchProfile(session.user.id);
    if (p) applyProfile(p);
    else setProfile(p);
  };

  return (
    <AuthContext.Provider value={{
      session,
      user: session?.user ?? null,
      profile,
      isTeacher: profile?.role === 'teacher',
      isStudent:  profile?.role === 'student',
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
