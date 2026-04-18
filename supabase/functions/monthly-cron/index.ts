// supabase/functions/monthly-cron/index.ts
// Called monthly to: (1) generate fee records, (2) send push alerts for overdue fees.
// Invoke via Supabase Dashboard → Edge Functions → Cron, or an external cron service.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { errorResponse, jsonResponse } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  // Protect with a shared secret so only authorized callers can trigger
  const cronSecret = Deno.env.get('CRON_SECRET');
  if (cronSecret) {
    const auth = req.headers.get('Authorization');
    if (auth !== `Bearer ${cronSecret}`) {
      return errorResponse('Unauthorized', 401);
    }
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const today = new Date();
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)
    .toISOString().split('T')[0];
  const todayStr = today.toISOString().split('T')[0];

  // ── 1. Generate monthly fees (upsert — safe to run twice) ────────────
  const { data: activeStudents } = await supabase
    .from('students')
    .select('id, teacher_id, monthly_fee, fee_due_day')
    .eq('is_paused', false)
    .gt('monthly_fee', 0);

  let feesGenerated = 0;
  const feeRows = (activeStudents ?? []).map((s) => {
    const dueDay = s.fee_due_day ?? 5;
    const dueDate = new Date(today.getFullYear(), today.getMonth(), dueDay)
      .toISOString().split('T')[0];
    return {
      teacher_id: s.teacher_id,
      student_id: s.id,
      month: monthStart,
      amount: s.monthly_fee,
      due_date: dueDate,
      status: 'Pending',
    };
  });

  if (feeRows.length > 0) {
    const { error } = await supabase
      .from('fees')
      .upsert(feeRows, { onConflict: 'teacher_id,student_id,month', ignoreDuplicates: true });
    if (!error) feesGenerated = feeRows.length;
  }

  // ── 2. Push notifications for overdue fees ────────────────────────────
  const vapidSubject = Deno.env.get('VAPID_SUBJECT');
  const vapidPub     = Deno.env.get('VAPID_PUBLIC_KEY');
  const vapidPriv    = Deno.env.get('VAPID_PRIVATE_KEY');
  const pushEnabled  = vapidSubject && vapidPub && vapidPriv;

  let pushSent = 0;

  if (pushEnabled) {
    const { data: overdueFees } = await supabase
      .from('fees')
      .select('student_id, amount, due_date, students(auth_user_id, full_name)')
      .eq('status', 'Pending')
      .lt('due_date', todayStr);

    for (const fee of overdueFees ?? []) {
      const authUserId = (fee.students as Record<string, string>)?.auth_user_id;
      if (!authUserId) continue;

      const { data: subs } = await supabase
        .from('push_subscriptions').select('*').eq('user_id', authUserId);

      const payload = JSON.stringify({
        title: 'Fee Overdue',
        body: `Tuition fee of ₹${Number(fee.amount).toLocaleString('en-IN')} was due on ${fee.due_date}`,
        url: '/student/fees',
      });

      for (const sub of subs ?? []) {
        try {
          // Simple push via the send-push function (reuse its logic)
          const res = await supabase.functions.invoke('send-push', {
            body: {
              user_id: authUserId,
              title: 'Fee Overdue',
              body: `Tuition fee of ₹${Number(fee.amount).toLocaleString('en-IN')} was due on ${fee.due_date}`,
              url: '/student/fees',
            },
          });
          if (!res.error) pushSent++;
          break; // one invoke per user, send-push handles all subs
        } catch { /* skip */ }
      }
    }
  }

  return jsonResponse({
    success: true,
    feesGenerated,
    pushSent,
    runAt: new Date().toISOString(),
  });
});
