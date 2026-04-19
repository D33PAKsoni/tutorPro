// src/supabase.js

import { createClient } from '@supabase/supabase-js';

const supabaseUrl     = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase env vars.\n' +
    'Required: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession:     true,
    autoRefreshToken:   true,
    detectSessionInUrl: true,
    storageKey:         'tuition-pro-auth',
    // ── IMPORTANT: Use 'implicit' flow, NOT 'pkce' ──────────────────────
    // PKCE stores the code_verifier in sessionStorage, which is wiped when
    // the browser tab is closed. On the next visit the code exchange fails
    // and the user is silently logged out even though their token is still
    // in localStorage. Implicit flow stores everything in localStorage and
    // correctly restores the session across tab closes / app restarts.
    flowType: 'implicit',
  },
});

export const toInternalEmail = (username) =>
  `${username.toLowerCase().trim()}@${import.meta.env.VITE_INTERNAL_EMAIL_DOMAIN || 'tuition.internal'}`;

export const fromInternalEmail = (email) => email.split('@')[0];

export default supabase;
