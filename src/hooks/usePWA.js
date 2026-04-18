// src/hooks/usePWA.js

import { useState, useEffect, useCallback } from 'react';
import { subscribeToPush } from '../lib/push';
import { supabase } from '../supabase';
import { useAuth } from '../context/AuthContext';

// ── Global prompt capture ────────────────────────────────────────────────────
// beforeinstallprompt can fire BEFORE React mounts. We capture it at module
// load time (runs immediately when the JS bundle is parsed) so no hook ever
// misses it, no matter how late it mounts.
let _deferredPrompt = null;
let _promptListeners = [];

function notifyListeners() {
  _promptListeners.forEach(fn => fn(_deferredPrompt));
}

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    _deferredPrompt = e;
    notifyListeners();
  });

  window.addEventListener('appinstalled', () => {
    _deferredPrompt = null;
    notifyListeners();
  });
}

// ── usePWAInstall ─────────────────────────────────────────────────────────────
export function usePWAInstall() {
  const [installPrompt, setInstallPrompt] = useState(_deferredPrompt);
  const [isInstalled, setIsInstalled] = useState(
    typeof window !== 'undefined' &&
    window.matchMedia('(display-mode: standalone)').matches
  );

  useEffect(() => {
    // Subscribe to future prompt changes (user dismisses, installs, etc.)
    const listener = (prompt) => {
      setInstallPrompt(prompt);
      if (!prompt) setIsInstalled(true);
    };
    _promptListeners.push(listener);

    // In case the event already fired before this effect ran, sync state
    if (_deferredPrompt && !installPrompt) {
      setInstallPrompt(_deferredPrompt);
    }

    return () => {
      _promptListeners = _promptListeners.filter(fn => fn !== listener);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const install = useCallback(async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === 'accepted') {
      _deferredPrompt = null;
      setInstallPrompt(null);
      setIsInstalled(true);
      notifyListeners();
    }
  }, [installPrompt]);

  return {
    canInstall: !!installPrompt && !isInstalled,
    isInstalled,
    install,
  };
}

// ── usePushPermission ─────────────────────────────────────────────────────────
export function usePushPermission() {
  const { user } = useAuth();
  const [permission, setPermission] = useState(
    typeof Notification !== 'undefined' ? Notification.permission : 'unsupported'
  );
  const [subscribing, setSubscribing] = useState(false);

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
      setPermission(
        typeof Notification !== 'undefined' ? Notification.permission : 'denied'
      );
      console.warn('[usePushPermission]', e.message);
    } finally {
      setSubscribing(false);
    }
  }, [supported, user]);

  return { permission, supported, subscribing, requestPermission };
}
