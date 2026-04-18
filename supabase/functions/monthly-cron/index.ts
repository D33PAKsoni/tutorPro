// supabase/functions/monthly-cron/index.ts
// Called monthly via pg_cron or external cron service
// 1. Generates fees for all active students
// 2. Sends push notifications for overdue fees

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import webpush from 'npm:web-push@3.6.6';

serve(async (req) => {
  // Verify cron secret to prevent unauthorized calls
  const authHeader = req.headers.get('Authorization');
  const cronSecret = Deno.env.get('CRON_SECRET');
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  webpush.setVapidDetails(
    Deno.env.get('VAPID_SUBJECT')!,
    Deno.env.get('VAPID_PUBLIC_KEY')!,
    Deno.env.get('VAPID_PRIVATE_KEY')!
  );

  const today = new Date();
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)
    .toISOString().split('T')[0];

  // ---- Step 1: Generate monthly fees ----
  const { data: activeStudents } = await supabase
    .from('students')
    .select('id, teacher_id, monthly_fee, fee_due_day')
    .eq('is_paused', false)
    .gt('monthly_fee', 0);

  let feesGenerated = 0;
  for (const s of activeStudents ?? []) {
    const dueDay = s.fee_due_day ?? 5;
    const dueDate = new Date(today.getFullYear(), today.getMonth(), dueDay)
      .toISOString().split('T')[0];

    const { error } = await supabase.from('fees').insert({
      teacher_id: s.teacher_id,
      student_id: s.id,
      month: monthStart,
      amount: s.monthly_fee,
      due_date: dueDate,
    });
    if (!error) feesGenerated++;
  }

  // ---- Step 2: Push notifications for overdue fees ----
  const { data: overdueFees } = await supabase
    .from('fees')
    .select('student_id, amount, due_date, students(auth_user_id, full_name)')
    .eq('status', 'Pending')
    .lt('due_date', today.toISOString().split('T')[0]);

  let pushSent = 0;
  for (const fee of overdueFees ?? []) {
    const authUserId = (fee.students as any)?.auth_user_id;
    if (!authUserId) continue;

    const { data: subs } = await supabase
      .from('push_subscriptions')
      .select('*')
      .eq('user_id', authUserId);

    const payload = JSON.stringify({
      title: 'Fee Overdue',
      body: `Your tuition fee of ₹${fee.amount.toLocaleString('en-IN')} was due on ${fee.due_date}`,
      url: '/student/fees',
    });

    for (const sub of subs ?? []) {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth_key } },
          payload
        );
        pushSent++;
      } catch {
        // ignore expired subs
      }
    }
  }

  return new Response(JSON.stringify({
    success: true,
    feesGenerated,
    pushSent,
    runAt: new Date().toISOString(),
  }), { headers: { 'Content-Type': 'application/json' } });
});
