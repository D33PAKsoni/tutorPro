// src/hooks/usePush.js
// Manages Web Push subscription lifecycle.
// Wraps src/lib/push.js with React state for UI feedback.

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabase';
import { useAuth } from '../context/AuthContext';
import { subscribeToPush, unsubscribeFromPush } from '../lib/push';

/**
 * usePush()
 * Provides push notification permission/subscription management.
 *
 * Usage:
 *   const { status, isSupported, enable, disable } = usePush();
 *
 * status: 'idle' | 'loading' | 'enabled' | 'denied' | 'error' | 'unsupported'
 */
export function usePush() {
  const { user } = useAuth();
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState(null);

  // Check browser support and existing subscription on mount
  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setStatus('unsupported');
      return;
    }

    // Check if already subscribed
    navigator.serviceWorker.ready.then(reg => {
      reg.pushManager.getSubscription().then(sub => {
        if (sub) setStatus('enabled');
        else if (Notification.permission === 'denied') setStatus('denied');
        else setStatus('idle');
      });
    }).catch(() => setStatus('idle'));
  }, []);

  const enable = useCallback(async () => {
    if (!user) return;
    setStatus('loading');
    setError(null);
    try {
      await subscribeToPush(supabase, user.id);
      setStatus('enabled');
    } catch (e) {
      const isDenied = e.message?.toLowerCase().includes('denied');
      setStatus(isDenied ? 'denied' : 'error');
      setError(e.message);
    }
  }, [user]);

  const disable = useCallback(async () => {
    if (!user) return;
    setStatus('loading');
    try {
      await unsubscribeFromPush(supabase, user.id);
      setStatus('idle');
    } catch (e) {
      setStatus('error');
      setError(e.message);
    }
  }, [user]);

  const isSupported = status !== 'unsupported';
  const isEnabled = status === 'enabled';
  const isLoading = status === 'loading';

  return {
    status,
    error,
    isSupported,
    isEnabled,
    isLoading,
    enable,
    disable,
  };
}
