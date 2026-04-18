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
    persistSession:    true,
    autoRefreshToken:  true,
    detectSessionInUrl: true,
    storageKey:        'tuition-pro-auth',
    // PKCE is the secure default for SPAs in supabase-js v2.
    // Implicit flow can cause issues with token detection on some hosts.
    flowType: 'pkce',
  },
});

export const toInternalEmail = (username) =>
  `${username.toLowerCase().trim()}@${import.meta.env.VITE_INTERNAL_EMAIL_DOMAIN || 'tuition.internal'}`;

export const fromInternalEmail = (email) => email.split('@')[0];

export default supabase;
