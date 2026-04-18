// src/components/student/FeeCard.jsx
// Displays a single fee record for the student.
// Shows status, amount, due date — NO paid_amount or payment ledger.

import { format, isPast, parseISO } from 'date-fns';

/**
 * FeeCard
 * @param {object} fee  - Fee record (id, amount, due_date, status, month, remark)
 */
export default function FeeCard({ fee }) {
  const isOverdue = fee.status === 'Pending' && isPast(new Date(fee.due_date));
  const isPaid = fee.status === 'Paid';
  const isWaived = fee.status === 'Waived';

  // Amount colour — green when paid, red when overdue, default otherwise
  const amountColor = isPaid ? '#1b5e20' : isOverdue ? 'var(--tertiary)' : 'var(--primary)';

  return (
    <div
      className="card-item ghost-border"
      style={{
        background: isOverdue
          ? 'rgba(255, 218, 214, 0.25)'
          : isPaid
          ? 'rgba(232, 245, 233, 0.35)'
          : 'var(--surface-container-lowest)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 'var(--space-md)' }}>
        {/* Left: labels */}
        <div style={{ flex: 1 }}>
          {/* Status row */}
          <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap', marginBottom: '0.375rem' }}>
            <span className={`chip chip-${fee.status.toLowerCase()}`}>
              {fee.status}
            </span>
            {isOverdue && (
              <span className="chip chip-overdue">Overdue</span>
            )}
          </div>

          {/* Title */}
          <div className="title-sm" style={{ marginBottom: '2px' }}>
            Monthly Tuition Fee
          </div>

          {/* Month */}
          <div className="label-sm text-surface-variant">
            {format(parseISO(fee.month), 'MMMM yyyy')}
          </div>

          {/* Due date */}
          <div
            className="label-sm"
            style={{
              color: isOverdue ? 'var(--tertiary)' : 'var(--on-surface-variant)',
              marginTop: '2px',
            }}
          >
            {isPaid ? 'Paid' : `Due: ${format(parseISO(fee.due_date), 'dd MMM yyyy')}`}
          </div>

          {/* Remark */}
          {fee.remark && (
            <div className="label-sm text-surface-variant" style={{ marginTop: 4 }}>
              Note: {fee.remark}
            </div>
          )}
        </div>

        {/* Right: amount */}
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 2 }}>
            <span
              className="label-sm"
              style={{ color: amountColor, opacity: 0.7 }}
            >
              ₹
            </span>
            <span
              className="headline-sm"
              style={{ color: amountColor }}
            >
              {Number(fee.amount).toLocaleString('en-IN')}
            </span>
          </div>
        </div>
      </div>

      {/* Paid indicator bar */}
      {isPaid && (
        <div style={{
          marginTop: 'var(--space-sm)',
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          color: '#1b5e20',
          fontSize: '0.75rem',
          fontWeight: 500,
        }}>
          <span className="material-symbols-outlined icon-filled" style={{ fontSize: '1rem' }}>check_circle</span>
          Payment received
        </div>
      )}
    </div>
  );
}
