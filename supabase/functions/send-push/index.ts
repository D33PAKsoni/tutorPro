// supabase/functions/send-push/index.ts
// Sends Web Push notifications with correct VAPID signing + RFC 8291 encryption.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { handleCors, errorResponse, jsonResponse } from '../_shared/cors.ts';

// ── Base64url helpers ────────────────────────────────────────────────────────
function b64urlDecode(s: string): Uint8Array {
  return Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
}
function b64urlEncode(buf: Uint8Array | ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

// ── VAPID JWT ────────────────────────────────────────────────────────────────
// VAPID private key from `web-push generate-vapid-keys` is a raw 32-byte
// P-256 scalar encoded as base64url. SubtleCrypto needs it as PKCS8.
function wrapRawEcPrivateKey(raw: Uint8Array): ArrayBuffer {
  // Minimal PKCS8 DER wrapper for a P-256 private key scalar (RFC 5915 / 5958)
  // ECPrivateKey ::= SEQUENCE { version INTEGER (1), privateKey OCTET STRING }
  // wrapped in a PrivateKeyInfo structure with the id-ecPublicKey OID + P-256 OID
  const ecPriv = new Uint8Array([
    0x30, 0x31,        // SEQUENCE (49 bytes)
      0x02, 0x01, 0x01,  // INTEGER version = 1
      0x04, 0x20,        // OCTET STRING (32 bytes) — the key scalar
      ...raw,
      0xa0, 0x0a,        // [0] — OID tag
        0x06, 0x08,      // OID (8 bytes) = P-256 curve
        0x2a, 0x86, 0x48, 0xce, 0x3d, 0x03, 0x01, 0x07,
  ]);
  const pkcs8 = new Uint8Array([
    0x30, 0x41,                // SEQUENCE (65 bytes total)
      0x02, 0x01, 0x00,        // INTEGER version = 0
      0x30, 0x13,              // SEQUENCE — AlgorithmIdentifier
        0x06, 0x07, 0x2a, 0x86, 0x48, 0xce, 0x3d, 0x02, 0x01, // OID id-ecPublicKey
        0x06, 0x08, 0x2a, 0x86, 0x48, 0xce, 0x3d, 0x03, 0x01, 0x07, // OID P-256
      0x04, 0x27,              // OCTET STRING wrapping ECPrivateKey
      ...ecPriv,
  ]);
  return pkcs8.buffer;
}

async function buildVapidJwt(
  endpoint: string, subject: string,
  pubKeyB64: string, privKeyB64: string,
): Promise<string> {
  const rawPriv = b64urlDecode(privKeyB64);
  const privKey = await crypto.subtle.importKey(
    'pkcs8', wrapRawEcPrivateKey(rawPriv),
    { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign'],
  );

  const enc     = new TextEncoder();
  const origin  = new URL(endpoint).origin;
  const exp     = Math.floor(Date.now() / 1000) + 43200;
  const header  = b64urlEncode(enc.encode(JSON.stringify({ typ: 'JWT', alg: 'ES256' })));
  const payload = b64urlEncode(enc.encode(JSON.stringify({ aud: origin, exp, sub: subject })));
  const sigBuf  = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    privKey,
    enc.encode(`${header}.${payload}`),
  );
  return `${header}.${payload}.${b64urlEncode(new Uint8Array(sigBuf))}`;
}

// ── RFC 8291 payload encryption (aesgcm / draft-03) ─────────────────────────
// Deno Deploy does not support the newer aes128gcm (RFC 8291 §4) yet, so we
// use the older aesgcm encoding (draft-ietf-webpush-encryption-03) which is
// universally supported by all push services (FCM, Mozilla, Edge).
async function encryptPayload(
  plaintext: string,
  p256dh: string,   // subscriber's public key (base64url)
  auth: string,     // subscriber's auth secret (base64url)
): Promise<{ body: Uint8Array; salt: string; serverPublicKey: string }> {
  const enc = new TextEncoder();

  const clientPubRaw = b64urlDecode(p256dh);
  const authSecret   = b64urlDecode(auth);

  // Ephemeral server ECDH key pair
  const serverKeyPair = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveKey', 'deriveBits'],
  );
  const serverPubRaw = new Uint8Array(
    await crypto.subtle.exportKey('raw', serverKeyPair.publicKey),
  );

  // Import subscriber public key for ECDH
  const clientPubKey = await crypto.subtle.importKey(
    'raw', clientPubRaw, { name: 'ECDH', namedCurve: 'P-256' }, false, [],
  );

  // ECDH shared secret
  const sharedBits = await crypto.subtle.deriveBits(
    { name: 'ECDH', public: clientPubKey }, serverKeyPair.privateKey, 256,
  );
  const sharedSecret = new Uint8Array(sharedBits);

  const salt = crypto.getRandomValues(new Uint8Array(16));

  // HKDF helper
  async function hkdf(
    ikm: Uint8Array, hkdfSalt: Uint8Array, info: Uint8Array, len: number,
  ): Promise<Uint8Array> {
    const key  = await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits']);
    const bits = await crypto.subtle.deriveBits(
      { name: 'HKDF', hash: 'SHA-256', salt: hkdfSalt, info }, key, len * 8,
    );
    return new Uint8Array(bits);
  }

  // PRK — pseudo-random key from shared secret + auth secret
  const prk = await hkdf(
    sharedSecret, authSecret,
    enc.encode('Content-Encoding: auth\0'), 32,
  );

  // context = "P-256\0" + len(client_pub) + client_pub + len(server_pub) + server_pub
  function makeContext(): Uint8Array {
    const ctx = new Uint8Array(5 + 1 + 2 + 65 + 2 + 65);
    let i = 0;
    ctx.set(enc.encode('P-256'), i); i += 5;
    ctx[i++] = 0x00;
    ctx[i++] = 0x00; ctx[i++] = 65; ctx.set(clientPubRaw, i); i += 65;
    ctx[i++] = 0x00; ctx[i++] = 65; ctx.set(serverPubRaw, i);
    return ctx;
  }
  const context = makeContext();

  function makeInfo(type: string): Uint8Array {
    const label = enc.encode(`Content-Encoding: ${type}\0`);
    const out   = new Uint8Array(label.length + context.length);
    out.set(label); out.set(context, label.length);
    return out;
  }

  const cek   = await hkdf(prk, salt, makeInfo('aesgcm'), 16);
  const nonce = await hkdf(prk, salt, makeInfo('nonce'),  12);

  const aesKey = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['encrypt']);

  // Padding: 2-byte zero prefix (no padding)
  const padded = new Uint8Array(2 + enc.encode(plaintext).length);
  padded.set(enc.encode(plaintext), 2);

  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: nonce }, aesKey, padded,
  );

  return {
    body:            new Uint8Array(encrypted),
    salt:            b64urlEncode(salt),
    serverPublicKey: b64urlEncode(serverPubRaw),
  };
}

// ── Send one subscription ────────────────────────────────────────────────────
async function sendOne(
  sub: { endpoint: string; p256dh: string; auth_key: string },
  payloadJson: string,
  vapidJwt: string,
  vapidPubKey: string,
): Promise<number> {
  const { body, salt, serverPublicKey } =
    await encryptPayload(payloadJson, sub.p256dh, sub.auth_key);

  const res = await fetch(sub.endpoint, {
    method: 'POST',
    headers: {
      'Authorization':  `vapid t=${vapidJwt},k=${vapidPubKey}`,
      'Content-Type':   'application/octet-stream',
      'Content-Encoding': 'aesgcm',
      'Encryption':     `salt=${salt}`,
      'Crypto-Key':     `dh=${serverPublicKey}`,
      'TTL':            '86400',
    },
    body,
  });
  return res.status;
}

// ── Edge function entry ──────────────────────────────────────────────────────
Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const { user_id, title, body, url } = await req.json();
    if (!user_id || !title) return errorResponse('Missing user_id or title');

    const subject = Deno.env.get('VAPID_SUBJECT')!;
    const pubKey  = Deno.env.get('VAPID_PUBLIC_KEY')!;
    const privKey = Deno.env.get('VAPID_PRIVATE_KEY')!;

    if (!subject || !pubKey || !privKey) {
      return errorResponse('VAPID secrets not configured', 500);
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } },
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
        console.log(`[send-push] endpoint=${sub.endpoint.slice(0,40)}… status=${status}`);
        if (status === 410 || status === 404) expired.push(sub.endpoint);
        else if (status >= 200 && status < 300) sent++;
      } catch (err) {
        console.error('[send-push] delivery error:', err);
      }
    }

    if (expired.length > 0) {
      await supabase.from('push_subscriptions').delete().in('endpoint', expired);
    }

    return jsonResponse({ sent, total: subs.length });
  } catch (err) {
    console.error('[send-push] fatal:', err);
    return errorResponse(err instanceof Error ? err.message : 'Internal error', 500);
  }
});
