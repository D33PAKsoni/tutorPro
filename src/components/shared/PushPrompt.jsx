// src/components/shared/PushPrompt.jsx
// Bottom sheet shown once per session asking the user to enable push notifications.
// Shown only if: supported, not yet granted/denied, and VAPID key is configured.

import { usePushPermission } from '../../hooks/usePWA';

export default function PushPrompt({ onDismiss }) {
  const { subscribing, requestPermission } = usePushPermission();

  async function handleEnable() {
    await requestPermission();
    onDismiss();
  }

  return (
    <div className="modal-overlay" onClick={onDismiss}>
      <div
        className="modal-sheet"
        onClick={e => e.stopPropagation()}
        style={{ gap: 'var(--space-sm)' }}
      >
        <div className="modal-handle" />

        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
          <div style={{
            width: 48, height: 48, borderRadius: 'var(--radius-full)',
            background: 'var(--primary-fixed)', display: 'flex',
            alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <span className="material-symbols-outlined icon-filled" style={{ color: 'var(--primary)' }}>
              notifications
            </span>
          </div>
          <div>
            <div className="title-sm">Stay on top of things</div>
            <div className="body-sm text-surface-variant" style={{ marginTop: 2 }}>
              Get notified about overdue fees and new notices instantly.
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 'var(--space-sm)', marginTop: 'var(--space-xs)' }}>
          <button className="btn btn-tertiary" style={{ flex: 1 }} onClick={onDismiss}>
            Not now
          </button>
          <button
            className="btn btn-primary"
            style={{ flex: 2 }}
            onClick={handleEnable}
            disabled={subscribing}
          >
            {subscribing
              ? <div className="spinner spinner--sm" />
              : <><span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>notifications_active</span> Enable</>
            }
          </button>
        </div>
      </div>
    </div>
  );
}
