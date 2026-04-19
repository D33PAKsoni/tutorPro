// supabase/functions/send-push/index.ts
// Sends a Web Push notification via VAPID to all subscriptions for a user.
// Uses proper ECDH content encryption (RFC 8291 / aes128gcm) so push
// services actually deliver the payload instead of rejecting it.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { handleCors, errorResponse, jsonResponse } from '../_shared/cors.ts';

// ── Base64url helpers ────────────────────────────────────────────────────────
function b64urlToBytes(b64: string): Uint8Array {
  const padded = b64.replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(padded);
  return Uint8Array.from(raw, c => c.charCodeAt(0));
}

function bytesToB64url(buf: Uint8Array): string {
  return btoa(String.fromCharCode(...buf))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

// ── VAPID JWT builder ────────────────────────────────────────────────────────
async function buildVapidJwt(
  endpoint: string,
  subject: string,
  pubKeyB64: string,
  privKeyB64: string
): Promise<string> {
  const privRaw = b64urlToBytes(privKeyB64);
  const pubRaw  = b64urlToBytes(pubKeyB64);

  // Import private key as ECDSA for signing
  const privKey = await crypto.subtle.importKey(
    'raw', privRaw,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false, ['sign']
  ).catch(async () => {
    // Some runtimes need pkcs8; try that path
    const pkcs8 = buildPkcs8(privRaw);
    return crypto.subtle.importKey(
      'pkcs8', pkcs8,
      { name: 'ECDSA', namedCurve: 'P-256' },
      false, ['sign']
    );
  });

  const origin  = new URL(endpoint).origin;
  const exp     = Math.floor(Date.now() / 1000) + 43200; // 12 h
  const enc     = new TextEncoder();
  const header  = bytesToB64url(enc.encode(JSON.stringify({ typ: 'JWT', alg: 'ES256' })));
  const payload = bytesToB64url(enc.encode(JSON.stringify({ aud: origin, exp, sub: subject })));
  const toSign  = enc.encode(`${header}.${payload}`);
  const sigBuf  = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, privKey, toSign);
  const sig     = bytesToB64url(new Uint8Array(sigBuf));

  return `${header}.${payload}.${sig}`;
}

// Build minimal PKCS8 wrapper for a raw P-256 private key scalar
function buildPkcs8(rawKey: Uint8Array): ArrayBuffer {
  // OID for id-ecPublicKey (1.2.840.10045.2.1) + OID for P-256 (1.2.840.10045.3.1.7)
  const prefix = new Uint8Array([
    0x30,0x41,0x02,0x01,0x00,0x30,0x13,0x06,0x07,0x2a,0x86,0x48,0xce,0x3d,0x02,0x01,
    0x06,0x08,0x2a,0x86,0x48,0xce,0x3d,0x03,0x01,0x07,0x04,0x27,0x30,0x25,0x02,0x01,
    0x01,0x04,0x20,
  ]);
  const out = new Uint8Array(prefix.length + rawKey.length);
  out.set(prefix); out.set(rawKey, prefix.length);
  return out.buffer;
}

// ── Web Push content encryption (RFC 8291 — aes128gcm) ─────────────────────
async function encryptPayload(
  plaintext: string,
  subscriptionP256dh: string,
  subscriptionAuth: string
): Promise<{ ciphertext: Uint8Array; salt: Uint8Array; serverPublicKey: Uint8Array }> {
  const enc = new TextEncoder();

  // Client's public key (from subscription)
  const clientPubRaw = b64urlToBytes(subscriptionP256dh);
  const authSecret   = b64urlToBytes(subscriptionAuth);

  // Generate ephemeral server key pair
  const serverKeyPair = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveKey', 'deriveBits']
  );

  const serverPubRaw = new Uint8Array(
    await crypto.subtle.exportKey('raw', serverKeyPair.publicKey)
  );

  // Import client public key for ECDH
  const clientPubKey = await crypto.subtle.importKey(
    'raw', clientPubRaw,
    { name: 'ECDH', namedCurve: 'P-256' },
    false, []
  );

  // ECDH shared secret
  const sharedBits = await crypto.subtle.deriveBits(
    { name: 'ECDH', public: clientPubKey },
    serverKeyPair.privateKey, 256
  );

  // HKDF to derive pseudorandom key (PRK) from shared secret + auth
  const prk = await hkdf(
    new Uint8Array(sharedBits),
    authSecret,
    buildInfo('auth', new Uint8Array(0), new Uint8Array(0)),
    32
  );

  const salt = crypto.getRandomValues(new Uint8Array(16));

  // Content encryption key + nonce
  const cek   = await hkdf(prk, salt, buildInfo('aesgcm128', clientPubRaw, serverPubRaw), 16);
  const nonce = await hkdf(prk, salt, buildInfo('nonce', clientPubRaw, serverPubRaw), 12);

  const key = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['encrypt']);

  const paddedPlaintext = padPayload(enc.encode(plaintext));
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: nonce }, key, paddedPlaintext
  );

  return { ciphertext: new Uint8Array(encrypted), salt, serverPublicKey: serverPubRaw };
}

// Simple HKDF using SubtleCrypto HKDF
async function hkdf(
  ikm: Uint8Array, salt: Uint8Array, info: Uint8Array, length: number
): Promise<Uint8Array> {
  const ikmKey = await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits']);
  const bits   = await crypto.subtle.deriveBits(
    { name: 'HKDF', hash: 'SHA-256', salt, info },
    ikmKey, length * 8
  );
  return new Uint8Array(bits);
}

function buildInfo(type: string, clientPub: Uint8Array, serverPub: Uint8Array): Uint8Array {
  const enc    = new TextEncoder();
  const label  = enc.encode(`Content-Encoding: ${type}\0`);
  // For 'auth', no key material appended
  if (type === 'auth') return label;
  // key_info = label || 0x00 || client_pub_len || client_pub || server_pub_len || server_pub
  const out = new Uint8Array(label.length + 1 + 2 + clientPub.length + 2 + serverPub.length);
  let i = 0;
  out.set(label, i); i += label.length;
  out[i++] = 0x00; // context separator
  out[i++] = 0x00; out[i++] = 65; out.set(clientPub, i); i += clientPub.length;
  out[i++] = 0x00; out[i++] = 65; out.set(serverPub, i);
  return out;
}

function padPayload(data: Uint8Array): Uint8Array {
  // Minimum 2-byte padding prefix (no padding value)
  const padded = new Uint8Array(2 + data.length);
  padded[0] = 0; padded[1] = 0; // pad length = 0
  padded.set(data, 2);
  return padded;
}

// ── Build the encrypted request body ────────────────────────────────────────
async function buildEncryptedBody(
  payload: string,
  p256dh: string,
  authKey: string
): Promise<{ body: Uint8Array; salt: string; serverPublicKey: string }> {
  const { ciphertext, salt, serverPublicKey } = await encryptPayload(payload, p256dh, authKey);
  return {
    body: ciphertext,
    salt: bytesToB64url(salt),
    serverPublicKey: bytesToB64url(serverPublicKey),
  };
}

// ── Send one push message ────────────────────────────────────────────────────
async function sendOne(
  sub: { endpoint: string; p256dh: string; auth_key: string },
  payload: string,
  vapidJwt: string,
  vapidPubKey: string
): Promise<number> {
  const { body, salt, serverPublicKey } = await buildEncryptedBody(payload, sub.p256dh, sub.auth_key);

  const res = await fetch(sub.endpoint, {
    method: 'POST',
    headers: {
      'Authorization': `vapid t=${vapidJwt},k=${vapidPubKey}`,
      'Content-Type': 'application/octet-stream',
      'Content-Encoding': 'aesgcm',
      'Encryption': `salt=${salt}`,
      'Crypto-Key': `dh=${serverPublicKey}`,
      'TTL': '86400',
    },
    body,
  });
  return res.status;
}

// ── Edge function entry point ────────────────────────────────────────────────
Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const { user_id, title, body, url } = await req.json();
    if (!user_id || !title) return errorResponse('Missing user_id or title');

    const subject = Deno.env.get('VAPID_SUBJECT')!;
    const pubKey  = Deno.env.get('VAPID_PUBLIC_KEY')!;
    const privKey = Deno.env.get('VAPID_PRIVATE_KEY')!;

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
        const jwt    = await buildVapidJwt(sub.endpoint, subject, pubKey, privKey);
        const status = await sendOne(sub, payload, jwt, pubKey);
        if (status === 410 || status === 404) expired.push(sub.endpoint);
        else if (status < 300) sent++;
        else console.warn(`[send-push] HTTP ${status} for endpoint ${sub.endpoint}`);
      } catch (err) {
        console.error('[send-push] delivery error:', err);
      }
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
