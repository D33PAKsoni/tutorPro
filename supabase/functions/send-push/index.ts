// supabase/functions/send-push/index.ts
// Sends Web Push notifications — correct VAPID JWT + RFC aesgcm encryption.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { handleCors, errorResponse, jsonResponse } from '../_shared/cors.ts';

// ── Base64url ────────────────────────────────────────────────────────────────
function b64uDec(s: string): Uint8Array {
  return Uint8Array.from(
    atob(s.replace(/-/g, '+').replace(/_/g, '/')),
    c => c.charCodeAt(0),
  );
}
function b64uEnc(buf: Uint8Array | ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

// ── PKCS8 wrapper for a raw 32-byte P-256 private key scalar ─────────────────
// web-push generate-vapid-keys outputs a raw scalar, not a PKCS8 key.
// SubtleCrypto importKey('pkcs8') needs a DER-encoded PrivateKeyInfo structure.
//
// Correct minimal structure (verified against real SubtleCrypto PKCS8 output):
//   PrivateKeyInfo SEQUENCE (0x30 0x41 = 65 bytes content):
//     version INTEGER 0
//     AlgorithmIdentifier SEQUENCE (0x30 0x13 = 19 bytes):
//       id-ecPublicKey OID
//       P-256 OID
//     privateKey OCTET STRING (0x04 0x27 = 39 bytes):
//       ECPrivateKey SEQUENCE (0x30 0x25 = 37 bytes):
//         version INTEGER 1
//         privateKey OCTET STRING [32-byte scalar]
//         ← NO public key field — it's optional and omitting it works fine
function wrapEcPrivateKey(raw32: Uint8Array): ArrayBuffer {
  return new Uint8Array([
    0x30, 0x41,                    // PrivateKeyInfo SEQUENCE, 65 bytes
      0x02, 0x01, 0x00,            // version = 0
      0x30, 0x13,                  // AlgorithmIdentifier SEQUENCE, 19 bytes
        0x06, 0x07,                // OID id-ecPublicKey (7 bytes)
          0x2a, 0x86, 0x48, 0xce, 0x3d, 0x02, 0x01,
        0x06, 0x08,                // OID P-256 (8 bytes)
          0x2a, 0x86, 0x48, 0xce, 0x3d, 0x03, 0x01, 0x07,
      0x04, 0x27,                  // privateKey OCTET STRING, 39 bytes
        0x30, 0x25,                // ECPrivateKey SEQUENCE, 37 bytes
          0x02, 0x01, 0x01,        // version = 1
          0x04, 0x20,              // privateKey OCTET STRING, 32 bytes
            ...raw32,              // ← the actual key scalar
  ]).buffer;
}

// ── VAPID JWT ────────────────────────────────────────────────────────────────
async function buildVapidJwt(
  endpoint: string,
  subject: string,
  vapidPubKeyB64: string,
  vapidPrivKeyB64: string,
): Promise<string> {
  const privKey = await crypto.subtle.importKey(
    'pkcs8',
    wrapEcPrivateKey(b64uDec(vapidPrivKeyB64)),
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign'],
  );
  const enc     = new TextEncoder();
  const origin  = new URL(endpoint).origin;
  const exp     = Math.floor(Date.now() / 1000) + 43200; // 12 h
  const header  = b64uEnc(enc.encode(JSON.stringify({ typ: 'JWT', alg: 'ES256' })));
  const payload = b64uEnc(enc.encode(JSON.stringify({ aud: origin, exp, sub: subject })));
  const sig     = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    privKey,
    enc.encode(`${header}.${payload}`),
  );
  return `${header}.${payload}.${b64uEnc(new Uint8Array(sig))}`;
}

// ── aesgcm payload encryption (draft-ietf-webpush-encryption-03) ─────────────
// Used instead of the newer aes128gcm because it is universally supported
// across FCM, Mozilla Push, Edge Push, and works on Deno Deploy.
// The Crypto-Key header MUST carry both dh= (ephemeral pub key) AND
// vapid= (VAPID public key) — omitting the vapid= part causes FCM to reject.
async function encryptPayload(
  plaintext: string,
  p256dhB64: string,   // subscriber public key from PushSubscription
  authB64: string,     // subscriber auth secret from PushSubscription
): Promise<{ body: Uint8Array; salt: string; serverPubKeyB64: string }> {
  const enc          = new TextEncoder();
  const clientPubRaw = b64uDec(p256dhB64);
  const authSecret   = b64uDec(authB64);

  // Generate ephemeral server ECDH key pair
  const serverKP = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits'],
  );
  const serverPubRaw = new Uint8Array(
    await crypto.subtle.exportKey('raw', serverKP.publicKey),
  );

  // ECDH shared secret
  const clientPub = await crypto.subtle.importKey(
    'raw', clientPubRaw, { name: 'ECDH', namedCurve: 'P-256' }, false, [],
  );
  const sharedSecret = new Uint8Array(
    await crypto.subtle.deriveBits(
      { name: 'ECDH', public: clientPub }, serverKP.privateKey, 256,
    ),
  );

  const salt = crypto.getRandomValues(new Uint8Array(16));

  // HKDF
  async function hkdf(
    ikm: Uint8Array, hkdfSalt: Uint8Array, info: Uint8Array, len: number,
  ): Promise<Uint8Array> {
    const key  = await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits']);
    const bits = await crypto.subtle.deriveBits(
      { name: 'HKDF', hash: 'SHA-256', salt: hkdfSalt, info }, key, len * 8,
    );
    return new Uint8Array(bits);
  }

  // PRK from shared secret + auth secret
  const prk = await hkdf(
    sharedSecret,
    authSecret,
    enc.encode('Content-Encoding: auth\0'),
    32,
  );

  // context = "P-256\0" || uint16(len(clientPub)) || clientPub || uint16(len(serverPub)) || serverPub
  const context = (() => {
    const buf = new Uint8Array(5 + 1 + 2 + 65 + 2 + 65);
    let i = 0;
    buf.set(enc.encode('P-256'), i); i += 5;
    buf[i++] = 0x00;                 // null separator
    buf[i++] = 0x00; buf[i++] = 65; buf.set(clientPubRaw, i); i += 65;
    buf[i++] = 0x00; buf[i++] = 65; buf.set(serverPubRaw, i);
    return buf;
  })();

  const makeInfo = (type: string) => {
    const label = enc.encode(`Content-Encoding: ${type}\0`);
    const out   = new Uint8Array(label.length + context.length);
    out.set(label); out.set(context, label.length);
    return out;
  };

  const cek   = await hkdf(prk, salt, makeInfo('aesgcm'), 16);
  const nonce = await hkdf(prk, salt, makeInfo('nonce'),  12);

  const aesKey = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['encrypt']);

  // Prepend 2-byte zero padding length header (no actual padding added)
  const input = new Uint8Array(2 + enc.encode(plaintext).length);
  input.set(enc.encode(plaintext), 2);

  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, aesKey, input),
  );

  return {
    body:             ciphertext,
    salt:             b64uEnc(salt),
    serverPubKeyB64:  b64uEnc(serverPubRaw),
  };
}

// ── Send one push subscription ───────────────────────────────────────────────
async function sendOne(
  sub: { endpoint: string; p256dh: string; auth_key: string },
  payloadJson: string,
  vapidJwt: string,
  vapidPubKeyB64: string,   // needed in Crypto-Key header alongside dh=
): Promise<number> {
  const { body, salt, serverPubKeyB64 } =
    await encryptPayload(payloadJson, sub.p256dh, sub.auth_key);

  const res = await fetch(sub.endpoint, {
    method: 'POST',
    headers: {
      // VAPID authorization
      'Authorization':    `vapid t=${vapidJwt},k=${vapidPubKeyB64}`,
      // Encryption headers for aesgcm
      'Content-Type':     'application/octet-stream',
      'Content-Encoding': 'aesgcm',
      'Encryption':       `salt=${salt}`,
      // IMPORTANT: Crypto-Key must combine dh= AND vapid= with semicolon.
      // Omitting vapid= causes FCM to return 400/401.
      'Crypto-Key':       `dh=${serverPubKeyB64};vapid=${vapidPubKeyB64}`,
      'TTL':              '86400',
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
      return errorResponse('VAPID secrets not configured on this function', 500);
    }

    const client = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    );

    const { data: subs, error: subErr } = await client
      .from('push_subscriptions').select('*').eq('user_id', user_id);

    if (subErr) return errorResponse(subErr.message, 500);
    if (!subs?.length) return jsonResponse({ sent: 0, message: 'No subscriptions for this user' });

    const payload  = JSON.stringify({ title, body: body ?? '', url: url ?? '/' });
    let sent       = 0;
    const expired: string[] = [];

    for (const sub of subs) {
      try {
        const jwt    = await buildVapidJwt(sub.endpoint, subject, pubKey, privKey);
        const status = await sendOne(sub, payload, jwt, pubKey);
        console.log(`[send-push] ${sub.endpoint.slice(0, 50)}… → HTTP ${status}`);
        if (status === 410 || status === 404) expired.push(sub.endpoint);
        else if (status >= 200 && status < 300) sent++;
        else console.warn(`[send-push] unexpected status ${status}`);
      } catch (err) {
        console.error('[send-push] delivery error:', err);
      }
    }

    if (expired.length) {
      await client.from('push_subscriptions').delete().in('endpoint', expired);
      console.log(`[send-push] removed ${expired.length} expired subscription(s)`);
    }

    return jsonResponse({ sent, total: subs.length });
  } catch (err) {
    console.error('[send-push] fatal:', err);
    return errorResponse(err instanceof Error ? err.message : 'Internal error', 500);
  }
});
