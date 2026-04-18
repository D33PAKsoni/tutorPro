// src/lib/push.js
// VAPID-based Web Push subscription management

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)));
}

export async function subscribeToPush(supabaseClient, userId) {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    throw new Error('Push notifications not supported in this browser');
  }

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') throw new Error('Notification permission denied');

  const registration = await navigator.serviceWorker.ready;

  const vapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
  if (!vapidKey) throw new Error('VAPID public key not configured');

  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(vapidKey),
  });

  const { endpoint, keys } = subscription.toJSON();

  const { error } = await supabaseClient.from('push_subscriptions').upsert({
    user_id: userId,
    endpoint,
    p256dh: keys.p256dh,
    auth_key: keys.auth,
  }, { onConflict: 'endpoint' });

  if (error) throw error;
  return subscription;
}

export async function unsubscribeFromPush(supabaseClient, userId) {
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();
  if (subscription) {
    await subscription.unsubscribe();
    await supabaseClient.from('push_subscriptions').delete()
      .eq('user_id', userId).eq('endpoint', subscription.endpoint);
  }
}
