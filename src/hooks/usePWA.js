// src/hooks/usePWA.js

import { useState, useEffect, useCallback } from 'react';
import { subscribeToPush, unsubscribeFromPush } from '../lib/push';
import { supabase } from '../supabase';
import { useAuth } from '../context/AuthContext';

// ── Global beforeinstallprompt capture ───────────────────────────────────────
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
    const listener = (prompt) => {
      setInstallPrompt(prompt);
      if (!prompt) setIsInstalled(true);
    };
    _promptListeners.push(listener);
    if (_deferredPrompt && !installPrompt) setInstallPrompt(_deferredPrompt);
    return () => { _promptListeners = _promptListeners.filter(fn => fn !== listener); };
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

  return { canInstall: !!installPrompt && !isInstalled, isInstalled, install };
}

// ── usePushPermission ─────────────────────────────────────────────────────────
export function usePushPermission() {
  const { user } = useAuth();
  const [permission, setPermission] = useState(
    typeof Notification !== 'undefined' ? Notification.permission : 'unsupported'
  );
  const [subscribing, setSubscribing] = useState(false);
  const [error, setError]             = useState(null);

  // Check VAPID key at runtime so we can show a clear error if missing
  const vapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;

  const supported =
    typeof Notification !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window;
  // Note: we don't gate `supported` on vapidKey — we want the Enable button
  // to appear and show a clear error message rather than hiding silently.

  const requestPermission = useCallback(async () => {
    setError(null);
    setSubscribing(true);
    try {
      await subscribeToPush(supabase, user?.id);
      setPermission('granted');
    } catch (e) {
      const msg = e.message || 'Unknown error';
      console.error('[usePushPermission]', msg);
      setError(msg);
      if (typeof Notification !== 'undefined') {
        setPermission(Notification.permission);
      }
    } finally {
      setSubscribing(false);
    }
  }, [user]);

  const requestUnsubscribe = useCallback(async () => {
    setError(null);
    try {
      await unsubscribeFromPush(supabase, user?.id);
      setPermission('default');
    } catch (e) {
      setError(e.message || 'Failed to unsubscribe');
    }
  }, [user]);

  return { permission, supported, subscribing, error, vapidKey, requestPermission, requestUnsubscribe };
}
