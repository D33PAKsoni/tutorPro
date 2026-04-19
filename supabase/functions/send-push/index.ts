// supabase/functions/send-push/index.ts
// Sends Web Push notifications using native Deno SubtleCrypto.
// No external push library — implements VAPID + AES-GCM encryption from scratch.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { handleCors, errorResponse, jsonResponse } from '../_shared/cors.ts';

// ── Helpers ───────────────────────────────────────────────────────────────────

function b64urlDecode(s: string): Uint8Array {
  s = s.replace(/-/g, '+').replace(/_/g, '/');
  while (s.length % 4) s += '=';
  return Uint8Array.from(atob(s), c => c.charCodeAt(0));
}

function b64urlEncode(buf: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function utf8(s: string): Uint8Array {
  return new TextEncoder().encode(s);
}

function concat(...arrays: Uint8Array[]): Uint8Array {
  const total = arrays.reduce((n, a) => n + a.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const a of arrays) { out.set(a, offset); offset += a.length; }
  return out;
}

// ── VAPID JWT ─────────────────────────────────────────────────────────────────

async function makeVapidJwt(
  endpoint: string,
  subject: string,
  publicKeyB64: string,
  privateKeyB64: string,
): Promise<string> {
  const origin = new URL(endpoint).origin;
  const exp    = Math.floor(Date.now() / 1000) + 12 * 3600;

  const header  = b64urlEncode(utf8(JSON.stringify({ typ: 'JWT', alg: 'ES256' })));
  const payload = b64urlEncode(utf8(JSON.stringify({ aud: origin, exp, sub: subject })));
  const signing = utf8(`${header}.${payload}`);

  const keyData = b64urlDecode(privateKeyB64);
  const key = await crypto.subtle.importKey(
    'pkcs8', keyData,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false, ['sign'],
  );
  const sig = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, signing);
  return `${header}.${payload}.${b64urlEncode(sig)}`;
}

// ── AES-GCM payload encryption (RFC 8291) ────────────────────────────────────

async function encryptPayload(
  payload: string,
  p256dhB64: string,
  authB64:   string,
): Promise<{ ciphertext: Uint8Array; salt: Uint8Array; serverPublicKey: Uint8Array }> {
  const plaintext   = utf8(payload);
  const receiverKey = await crypto.subtle.importKey(
    'raw', b64urlDecode(p256dhB64),
    { name: 'ECDH', namedCurve: 'P-256' },
    true, [],
  );
  const authSecret = b64urlDecode(authB64);

  // Generate ephemeral sender key pair
  const senderKeys = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits'],
  );
  const senderPubRaw = new Uint8Array(
    await crypto.subtle.exportKey('raw', senderKeys.publicKey),
  );

  // ECDH shared secret
  const sharedBits = await crypto.subtle.deriveBits(
    { name: 'ECDH', public: receiverKey },
    senderKeys.privateKey, 256,
  );
  const sharedSecret = new Uint8Array(sharedBits);

  // PRK_key — HKDF with auth secret
  const prkKeyMaterial = await crypto.subtle.importKey(
    'raw', authSecret, { name: 'HKDF' }, false, ['deriveBits'],
  );
  const receiverPubRaw = new Uint8Array(await crypto.subtle.exportKey('raw', receiverKey));

  const keyInfoPrefix = utf8('WebPush: info\x00');
  const keyInfo = concat(keyInfoPrefix, receiverPubRaw, senderPubRaw);

  const prkKeyBits = await crypto.subtle.deriveBits(
    { name: 'HKDF', hash: 'SHA-256', salt: sharedSecret, info: keyInfo },
    prkKeyMaterial, 256,
  );
  const prkKey = new Uint8Array(prkKeyBits);

  // Salt
  const salt = crypto.getRandomValues(new Uint8Array(16));

  // IKM from PRK
  const ikmMaterial = await crypto.subtle.importKey(
    'raw', prkKey, { name: 'HKDF' }, false, ['deriveBits'],
  );
  const ikmInfo = concat(utf8('Content-Encoding: aes128gcm\x00'), new Uint8Array(1));
  const ikmBits = await crypto.subtle.deriveBits(
    { name: 'HKDF', hash: 'SHA-256', salt, info: ikmInfo },
    ikmMaterial, 128,
  );
  const contentKey = await crypto.subtle.importKey(
    'raw', ikmBits, { name: 'AES-GCM' }, false, ['encrypt'],
  );

  // Nonce
  const nonceInfo = concat(utf8('Content-Encoding: nonce\x00'), new Uint8Array(1));
  const nonceBits = await crypto.subtle.deriveBits(
    { name: 'HKDF', hash: 'SHA-256', salt, info: nonceInfo },
    ikmMaterial, 96,
  );
  const nonce = new Uint8Array(nonceBits);

  // Padding + encrypt (RFC 8291 record format)
  const paddedPlaintext = concat(plaintext, new Uint8Array([2])); // delimiter byte
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: nonce }, contentKey, paddedPlaintext,
  );

  // Build RFC 8291 content-encoding header
  const rs = new Uint8Array(4);
  new DataView(rs.buffer).setUint32(0, 4096, false); // record size
  const keyIdLen = new Uint8Array([senderPubRaw.length]);
  const header = concat(salt, rs, keyIdLen, senderPubRaw);

  return {
    ciphertext: concat(header, new Uint8Array(encrypted)),
    salt,
    serverPublicKey: senderPubRaw,
  };
}

// ── Main handler ──────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const { user_id, title, body, url } = await req.json();
    if (!user_id || !title) return errorResponse('Missing user_id or title');

    const vapidSubject = Deno.env.get('VAPID_SUBJECT');
    const vapidPubKey  = Deno.env.get('VAPID_PUBLIC_KEY');
    const vapidPrivKey = Deno.env.get('VAPID_PRIVATE_KEY');

    if (!vapidSubject || !vapidPubKey || !vapidPrivKey) {
      return errorResponse('VAPID secrets not configured', 500);
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    );

    const { data: subs } = await supabase
      .from('push_subscriptions')
      .select('endpoint, p256dh, auth_key')
      .eq('user_id', user_id);

    if (!subs?.length) return jsonResponse({ sent: 0, message: 'No subscriptions' });

    const payload = JSON.stringify({ title, body: body || '', url: url || '/' });
    let sent = 0;
    const expired: string[] = [];

    for (const sub of subs) {
      try {
        const { ciphertext } = await encryptPayload(payload, sub.p256dh, sub.auth_key);
        const jwt = await makeVapidJwt(sub.endpoint, vapidSubject, vapidPubKey, vapidPrivKey);

        const res = await fetch(sub.endpoint, {
          method: 'POST',
          headers: {
            'Authorization':     `vapid t=${jwt},k=${vapidPubKey}`,
            'Content-Type':      'application/octet-stream',
            'Content-Encoding':  'aes128gcm',
            'TTL':               '86400',
          },
          body: ciphertext,
        });

        if (res.status === 410 || res.status === 404) expired.push(sub.endpoint);
        else if (res.status < 300) sent++;
        else console.warn('[send-push] delivery status', res.status, sub.endpoint);
      } catch (e) {
        console.error('[send-push] sub error:', e);
      }
    }

    if (expired.length > 0) {
      await supabase.from('push_subscriptions').delete().in('endpoint', expired);
    }

    return jsonResponse({ sent, total: subs.length });
  } catch (err) {
    console.error('[send-push]', err);
    return errorResponse(err instanceof Error ? err.message : 'Internal error', 500);
  }
});
