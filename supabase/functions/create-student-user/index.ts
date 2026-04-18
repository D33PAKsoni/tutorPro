// supabase/functions/create-student-user/index.ts
// Creates a Supabase Auth user for a new student.
// Must be called by an authenticated teacher — verified via JWT.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { handleCors, errorResponse, jsonResponse } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    // ── 1. Authenticate the calling teacher ──────────────────────────────
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return errorResponse('Missing or malformed Authorization header', 401);
    }
    const jwt = authHeader.replace('Bearer ', '');

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const { data: { user: caller }, error: authErr } = await supabaseAdmin.auth.getUser(jwt);
    if (authErr || !caller) return errorResponse('Unauthorized', 401);

    const { data: profile } = await supabaseAdmin
      .from('profiles').select('role').eq('id', caller.id).single();
    if (profile?.role !== 'teacher') {
      return errorResponse('Only teachers can create student accounts', 403);
    }

    // ── 2. Parse body ─────────────────────────────────────────────────────
    const body = await req.json().catch(() => null);
    if (!body) return errorResponse('Invalid JSON body');

    const { email, password, full_name, username } = body;
    if (!email || !password || !full_name || !username) {
      return errorResponse('Missing required fields: email, password, full_name, username');
    }

    // ── 3. Create the auth user ───────────────────────────────────────────
    const { data: newUser, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { role: 'student', full_name, username },
    });

    if (createErr) {
      if (createErr.message.includes('already')) {
        return errorResponse(`Username "${username}" is already taken`, 409);
      }
      return errorResponse(createErr.message);
    }

    return jsonResponse({ user_id: newUser.user.id, email });

  } catch (err) {
    console.error('[create-student-user]', err);
    return errorResponse(err instanceof Error ? err.message : 'Internal server error', 500);
  }
});
