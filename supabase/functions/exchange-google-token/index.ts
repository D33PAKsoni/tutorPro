// supabase/functions/exchange-google-token/index.ts
// Exchanges a Google OAuth authorization code for access + refresh tokens,
// then stores them encrypted in the teacher's profile row.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { handleCors, errorResponse, jsonResponse } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) return errorResponse('Unauthorized', 401);

    const { code, redirect_uri } = await req.json();
    if (!code || !redirect_uri) return errorResponse('Missing code or redirect_uri');

    // ── 1. Exchange code for tokens ───────────────────────────────────────
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: Deno.env.get('GOOGLE_CLIENT_ID')!,
        client_secret: Deno.env.get('GOOGLE_CLIENT_SECRET')!,
        redirect_uri,
        grant_type: 'authorization_code',
      }),
    });

    const tokens = await tokenRes.json();
    if (tokens.error) {
      return errorResponse(tokens.error_description || tokens.error);
    }

    // ── 2. Identify the calling user ──────────────────────────────────────
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const { data: { user }, error: userErr } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );
    if (userErr || !user) return errorResponse('Could not identify user', 401);

    // ── 3. Persist tokens in the profile ─────────────────────────────────
    const { error: updateErr } = await supabase.from('profiles').update({
      google_drive_token: {
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,           // long-lived
        expiry_date: Date.now() + (tokens.expires_in ?? 3600) * 1000,
      },
    }).eq('id', user.id);

    if (updateErr) return errorResponse(updateErr.message);

    return jsonResponse({ success: true });

  } catch (err) {
    console.error('[exchange-google-token]', err);
    return errorResponse(err instanceof Error ? err.message : 'Internal error', 500);
  }
});
