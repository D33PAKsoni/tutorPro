// supabase/functions/send-push/index.ts
// Sends a Web Push notification via VAPID to all subscriptions for a user.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { handleCors, errorResponse, jsonResponse } from '../_shared/cors.ts';

// web-push compatible implementation using SubtleCrypto — no npm dependency needed
// We build the VAPID Authorization header manually so Deno Deploy doesn't need npm:web-push

async function importVapidKey(privateKeyB64: string): Promise<CryptoKey> {
  const raw = Uint8Array.from(atob(privateKeyB64.replace(/-/g,'+').replace(/_/g,'/')), c => c.charCodeAt(0));
  return crypto.subtle.importKey('pkcs8', raw, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
}

function b64url(buf: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

async function buildVapidAuth(endpoint: string, subject: string, pubKey: string, privKeyB64: string): Promise<string> {
  const origin = new URL(endpoint).origin;
  const exp = Math.floor(Date.now() / 1000) + 12 * 3600;
  const header = b64url(new TextEncoder().encode(JSON.stringify({ typ: 'JWT', alg: 'ES256' })));
  const payload = b64url(new TextEncoder().encode(JSON.stringify({ aud: origin, exp, sub: subject })));
  const sigInput = new TextEncoder().encode(`${header}.${payload}`);
  const key = await importVapidKey(privKeyB64);
  const sig = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, sigInput);
  const jwt = `${header}.${payload}.${b64url(sig)}`;
  return `vapid t=${jwt},k=${pubKey}`;
}

async function sendOne(sub: { endpoint: string; p256dh: string; auth_key: string }, payload: string, vapidAuth: string): Promise<number> {
  const res = await fetch(sub.endpoint, {
    method: 'POST',
    headers: {
      'Authorization': vapidAuth,
      'Content-Type': 'application/octet-stream',
      'Content-Encoding': 'aes128gcm',
      'TTL': '86400',
    },
    body: new TextEncoder().encode(payload),
  });
  return res.status;
}

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const { user_id, title, body, url } = await req.json();
    if (!user_id || !title) return errorResponse('Missing user_id or title');

    const subject  = Deno.env.get('VAPID_SUBJECT')!;
    const pubKey   = Deno.env.get('VAPID_PUBLIC_KEY')!;
    const privKey  = Deno.env.get('VAPID_PRIVATE_KEY')!;

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const { data: subs } = await supabase
      .from('push_subscriptions').select('*').eq('user_id', user_id);

    if (!subs?.length) return jsonResponse({ sent: 0, message: 'No subscriptions found' });

    const payload = JSON.stringify({ title, body: body || '', url: url || '/' });
    let sent = 0;
    const expired: string[] = [];

    for (const sub of subs) {
      try {
        const auth = await buildVapidAuth(sub.endpoint, subject, pubKey, privKey);
        const status = await sendOne(sub, payload, auth);
        if (status === 410 || status === 404) expired.push(sub.endpoint);
        else if (status < 300) sent++;
      } catch { /* ignore individual delivery failures */ }
    }

    if (expired.length > 0) {
      await supabase.from('push_subscriptions').delete().in('endpoint', expired);
    }

    return jsonResponse({ sent });
  } catch (err) {
    console.error('[send-push]', err);
    return errorResponse(err instanceof Error ? err.message : 'Internal error', 500);
  }
});
