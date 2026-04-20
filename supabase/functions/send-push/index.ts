// supabase/functions/send-push/index.ts
// Uses npm:web-push — the standard Node/Deno web push library.
// This handles VAPID JWT signing and aesgcm/aes128gcm encryption correctly.

import webpush from 'npm:web-push@3.6.7';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { handleCors, errorResponse, jsonResponse } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const { user_id, title, body, url } = await req.json();
    if (!user_id || !title) return errorResponse('Missing user_id or title');

    const subject = Deno.env.get('VAPID_SUBJECT');
    const pubKey  = Deno.env.get('VAPID_PUBLIC_KEY');
    const privKey = Deno.env.get('VAPID_PRIVATE_KEY');

    if (!subject || !pubKey || !privKey) {
      console.error('[send-push] Missing VAPID secrets');
      return errorResponse('VAPID secrets not configured — set VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY via supabase secrets set', 500);
    }

    // Configure web-push with VAPID details
    webpush.setVapidDetails(subject, pubKey, privKey);

    const client = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    );

    const { data: subs, error: subErr } = await client
      .from('push_subscriptions')
      .select('*')
      .eq('user_id', user_id);

    if (subErr) return errorResponse(subErr.message, 500);
    if (!subs?.length) return jsonResponse({ sent: 0, message: 'No subscriptions for this user' });

    const payload = JSON.stringify({ title, body: body ?? '', url: url ?? '/' });
    let sent = 0;
    const expired: string[] = [];
    const results: { endpoint: string; status: number; outcome: string }[] = [];

    for (const sub of subs) {
      const pushSub = {
        endpoint: sub.endpoint,
        keys: { p256dh: sub.p256dh, auth: sub.auth_key },
      };

      try {
        const res = await webpush.sendNotification(pushSub, payload);
        const status = res.statusCode;
        console.log(`[send-push] ${sub.endpoint.slice(0, 50)}… → HTTP ${status}`);
        sent++;
        results.push({ endpoint: sub.endpoint.slice(0, 50) + '…', status, outcome: 'delivered' });
      } catch (err: unknown) {
        const e = err as { statusCode?: number; message?: string };
        const status = e.statusCode ?? 0;
        console.error(`[send-push] ${sub.endpoint.slice(0, 50)}… → error ${status}:`, e.message);

        let outcome = e.message ?? 'unknown error';
        if (status === 404 || status === 410) {
          expired.push(sub.endpoint);
          outcome = 'expired — removed from DB';
        } else if (status === 401) {
          outcome = '401 unauthorized — check VAPID keys match between client and server';
        } else if (status === 403) {
          outcome = '403 forbidden — VAPID public key mismatch with subscription';
        }
        results.push({ endpoint: sub.endpoint.slice(0, 50) + '…', status, outcome });
      }
    }

    if (expired.length) {
      await client.from('push_subscriptions').delete().in('endpoint', expired);
      console.log(`[send-push] removed ${expired.length} expired subscription(s)`);
    }

    return jsonResponse({ sent, total: subs.length, results });
  } catch (err) {
    console.error('[send-push] fatal:', err);
    return errorResponse(err instanceof Error ? err.message : 'Internal error', 500);
  }
});
