// src/hooks/usePWA.js
// Manages PWA install prompt and push notification permission

import { useState, useEffect, useCallback } from 'react';
import { subscribeToPush } from '../lib/push';
import { supabase } from '../supabase';
import { useAuth } from '../context/AuthContext';

// ── PWA Install ─────────────────────────────────────────────────────────────
// Captures the beforeinstallprompt event so we can trigger it on button click.
export function usePWAInstall() {
  const [installPrompt, setInstallPrompt] = useState(null);
  const [isInstalled, setIsInstalled]     = useState(false);

  useEffect(() => {
    // Already installed (standalone mode)
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      return;
    }

    const handler = (e) => {
      e.preventDefault();          // stop browser mini-bar
      setInstallPrompt(e);         // save for later
    };

    window.addEventListener('beforeinstallprompt', handler);

    // Fires after the user installs from our button
    window.addEventListener('appinstalled', () => {
      setIsInstalled(true);
      setInstallPrompt(null);
    });

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const install = useCallback(async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === 'accepted') {
      setInstallPrompt(null);
      setIsInstalled(true);
    }
  }, [installPrompt]);

  return {
    canInstall: !!installPrompt && !isInstalled,
    isInstalled,
    install,
  };
}

// ── Push Notification ────────────────────────────────────────────────────────
// Returns current permission state and a function to request + subscribe.
export function usePushPermission() {
  const { user } = useAuth();
  const [permission, setPermission] = useState(
    typeof Notification !== 'undefined' ? Notification.permission : 'unsupported'
  );
  const [subscribing, setSubscribing] = useState(false);

  // Check if push is supported
  const supported =
    typeof Notification !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    !!import.meta.env.VITE_VAPID_PUBLIC_KEY;

  const requestPermission = useCallback(async () => {
    if (!supported || !user) return;
    setSubscribing(true);
    try {
      await subscribeToPush(supabase, user.id);
      setPermission('granted');
    } catch (e) {
      // User denied or SW not ready — read actual permission state
      setPermission(Notification.permission);
      console.warn('[usePushPermission]', e.message);
    } finally {
      setSubscribing(false);
    }
  }, [supported, user]);

  return { permission, supported, subscribing, requestPermission };
}
