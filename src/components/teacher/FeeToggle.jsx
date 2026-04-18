// src/components/teacher/FeeToggle.jsx
// A single fee row with student info, amount, due date, and a paid toggle switch

import { format, parseISO } from 'date-fns';

function getInitials(name = '') {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

/**
 * Props:
 *  - fee: fee record joined with students(full_name, student_id, advance_balance, is_paused)
 *  - onToggle(fee): called when the paid/unpaid switch is flipped
 *  - onEdit(fee): called when the row body is tapped (opens detail modal)
 *  - toggling: boolean — true while this fee's toggle is in-flight
 */
export default function FeeToggle({ fee, onToggle, onEdit, toggling = false }) {
  const isOverdue = fee.status === 'Pending' && new Date(fee.due_date) < new Date();

  return (
    <div
      className="card-item"
      style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}
    >
      <div className="student-avatar" style={{ opacity: fee.students?.is_paused ? 0.5 : 1 }}>
        {getInitials(fee.students?.full_name || '')}
      </div>

      {/* Row body — tapping opens detail edit */}
      <div style={{ flex: 1, cursor: 'pointer' }} onClick={() => onEdit?.(fee)}>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <span className="title-sm">{fee.students?.full_name}</span>
          {isOverdue && <span className="chip chip-overdue">Overdue</span>}
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', marginTop: 2 }}>
          <span style={{ color: 'var(--on-surface-variant)', fontSize: '0.875rem' }}>
            <span style={{ fontWeight: 400 }}>₹</span>
            <span className="title-sm">{fee.amount?.toLocaleString('en-IN')}</span>
          </span>
          <span className="label-sm text-surface-variant">
            Due {format(parseISO(fee.due_date), 'dd MMM')}
          </span>
        </div>
        {fee.students?.advance_balance > 0 && (
          <div className="label-sm" style={{ color: 'var(--secondary)', marginTop: 2 }}>
            Advance: ₹{fee.students.advance_balance.toLocaleString('en-IN')}
          </div>
        )}
      </div>

      {/* Paid toggle */}
      <label
        className="toggle-switch"
        style={{ cursor: toggling ? 'wait' : 'pointer', opacity: toggling ? 0.6 : 1 }}
        title={fee.status === 'Paid' ? 'Mark unpaid' : 'Mark paid'}
        aria-label={`Mark ${fee.students?.full_name} fee as ${fee.status === 'Paid' ? 'unpaid' : 'paid'}`}
      >
        <input
          type="checkbox"
          checked={fee.status === 'Paid'}
          onChange={() => !toggling && onToggle?.(fee)}
          style={{ display: 'none' }}
        />
        <div className="toggle-track">
          <div className="toggle-thumb" />
        </div>
      </label>
    </div>
  );
}
