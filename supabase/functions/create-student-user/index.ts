// supabase/functions/create-student-user/index.ts
// Edge Function: Creates an auth user for a student using the service role
// Only callable by authenticated teachers

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Verify the calling user is authenticated
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('No authorization header');

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Verify caller is a teacher
    const { data: { user: caller }, error: authErr } = await supabaseAdmin.auth.getUser(
      authHeader.replace('Bearer ', '')
    );
    if (authErr || !caller) throw new Error('Unauthorized');

    const { data: profile } = await supabaseAdmin
      .from('profiles').select('role').eq('id', caller.id).single();
    if (profile?.role !== 'teacher') throw new Error('Only teachers can create student accounts');

    // Create the student user
    const { email, password, full_name, username } = await req.json();
    if (!email || !password || !full_name) throw new Error('Missing required fields');

    const { data: newUser, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm for students (no email verification)
      user_metadata: { role: 'student', full_name, username },
    });

    if (createErr) throw createErr;

    return new Response(JSON.stringify({ user_id: newUser.user.id, email }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
