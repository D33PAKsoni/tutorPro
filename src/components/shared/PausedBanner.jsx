// src/components/shared/PausedBanner.jsx
export default function PausedBanner({ reason }) {
  return (
    <div className="paused-banner" role="alert">
      <span className="material-symbols-outlined icon-filled" style={{ color: 'var(--on-tertiary-container)' }}>
        pause_circle
      </span>
      <div>
        <div style={{ fontWeight: 700 }}>Account Paused</div>
        {reason && (
          <div style={{ fontSize: '0.75rem', fontWeight: 400, opacity: 0.8, marginTop: 2 }}>
            {reason}
          </div>
        )}
      </div>
    </div>
  );
}

// src/components/shared/SiblingSwitch.jsx — Bottom sheet to switch between linked accounts
// (Exported as separate component below)
