// src/components/teacher/FeeToggle.jsx
// Accessible toggle switch for marking a fee as Paid / Unpaid.
// Shows the current status chip alongside the toggle.

import { useState } from 'react';

/**
 * FeeToggle
 * @param {object}   fee       - Fee record from DB
 * @param {function} onToggle  - async (fee) => void — called on change
 */
export default function FeeToggle({ fee, onToggle }) {
  const [busy, setBusy] = useState(false);
  const isPaid = fee.status === 'Paid';

  async function handleChange() {
    if (busy) return;
    setBusy(true);
    try {
      await onToggle(fee);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
      {/* Status chip */}
      <span className={`chip ${isPaid ? 'chip-paid' : 'chip-pending'}`}>
        {fee.status}
      </span>

      {/* Toggle switch */}
      {busy ? (
        <div className="spinner spinner--sm" aria-label="Updating..." />
      ) : (
        <label
          className="toggle-switch"
          style={{ cursor: 'pointer' }}
          title={isPaid ? 'Mark as Unpaid' : 'Mark as Paid'}
          aria-label={isPaid ? 'Marked paid — click to undo' : 'Mark as paid'}
        >
          <input
            type="checkbox"
            checked={isPaid}
            onChange={handleChange}
            style={{ display: 'none' }}
            aria-checked={isPaid}
            role="switch"
          />
          <div className="toggle-track">
            <div className="toggle-thumb" />
          </div>
        </label>
      )}
    </div>
  );
}
