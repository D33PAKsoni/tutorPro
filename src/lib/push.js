// src/lib/push.js

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)));
}

export async function subscribeToPush(supabaseClient, userId) {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    throw new Error('Push not supported in this browser');
  }

  const vapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
  if (!vapidKey) {
    throw new Error(
      'VITE_VAPID_PUBLIC_KEY is not set. ' +
      'Add it to Vercel → Settings → Environment Variables, then redeploy.'
    );
  }

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') throw new Error('Notification permission denied');

  const registration = await navigator.serviceWorker.ready;

  // Unsubscribe any existing subscription first so we always get a fresh one
  const existing = await registration.pushManager.getSubscription();
  if (existing) await existing.unsubscribe();

  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(vapidKey),
  });

  const { endpoint, keys } = subscription.toJSON();

  console.log('[push] Saving subscription to DB for user', userId);
  console.log('[push] endpoint:', endpoint.slice(0, 60) + '…');

  const { error } = await supabaseClient
    .from('push_subscriptions')
    .upsert(
      { user_id: userId, endpoint, p256dh: keys.p256dh, auth_key: keys.auth },
      { onConflict: 'endpoint' }
    );

  if (error) {
    console.error('[push] DB upsert failed:', error);
    throw new Error(`Failed to save subscription: ${error.message} (code ${error.code})`);
  }

  console.log('[push] Subscription saved successfully');
  return subscription;
}

export async function unsubscribeFromPush(supabaseClient, userId) {
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();
  if (subscription) {
    const endpoint = subscription.endpoint;
    await subscription.unsubscribe();
    await supabaseClient
      .from('push_subscriptions')
      .delete()
      .eq('user_id', userId)
      .eq('endpoint', endpoint);
    console.log('[push] Unsubscribed and removed from DB');
  }
}
