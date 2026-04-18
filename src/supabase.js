// src/supabase.js
// Single Supabase client instance for the entire app

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables. Check your .env.local file.\n' +
    'Required: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'tuition-pro-auth',
  },
  realtime: {
    params: { eventsPerSecond: 10 },
  },
});

// Helper: build internal email from username
export const toInternalEmail = (username) =>
  `${username.toLowerCase().trim()}@${import.meta.env.VITE_INTERNAL_EMAIL_DOMAIN || 'tuition.internal'}`;

// Helper: extract username from internal email
export const fromInternalEmail = (email) =>
  email.split('@')[0];

export default supabase;
