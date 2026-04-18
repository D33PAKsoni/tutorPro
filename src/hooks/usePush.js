// src/hooks/usePush.js
// Hook wrapping the VAPID push subscription flow

import { useState, useCallback } from 'react';
import { subscribeToPush, unsubscribeFromPush } from '../lib/push';
import { supabase } from '../supabase';
import { useAuth } from '../context/AuthContext';

/**
 * Returns:
 *  - status: 'idle' | 'loading' | 'enabled' | 'error'
 *  - enable(): subscribe to push
 *  - disable(): unsubscribe
 *  - errorMsg: string | null
 */
export function usePush() {
  const { user } = useAuth();
  const [status, setStatus] = useState('idle');
  const [errorMsg, setErrorMsg] = useState(null);

  const enable = useCallback(async () => {
    if (!user) return;
    setStatus('loading');
    setErrorMsg(null);
    try {
      await subscribeToPush(supabase, user.id);
      setStatus('enabled');
    } catch (e) {
      setStatus('error');
      setErrorMsg(e.message || 'Could not enable push notifications');
    }
  }, [user]);

  const disable = useCallback(async () => {
    if (!user) return;
    try {
      await unsubscribeFromPush(supabase, user.id);
      setStatus('idle');
    } catch (e) {
      setErrorMsg(e.message || 'Could not disable push notifications');
    }
  }, [user]);

  return { status, enable, disable, errorMsg };
}
