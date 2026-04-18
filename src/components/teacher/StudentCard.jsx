// src/components/teacher/StudentCard.jsx
// Reusable student list card used in Students page and attendance lists.
// Shows avatar, name, ID badge, status chips, and action buttons.

import { useState } from 'react';

function getInitials(name = '') {
  return name
    .split(' ')
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

/**
 * StudentCard
 * @param {object}   student          - Student row from DB
 * @param {function} onEdit           - () => void — open edit modal
 * @param {function} onTogglePause    - (student) => void
 * @param {function} onDelete         - (id) => void
 * @param {boolean}  [compact=false]  - Smaller card for attendance lists
 * @param {ReactNode} [rightSlot]     - Optional right-side slot (e.g. fee toggle, radio group)
 */
export default function StudentCard({
  student,
  onEdit,
  onTogglePause,
  onDelete,
  compact = false,
  rightSlot,
  onClick,
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  function handleDelete() {
    if (!confirmDelete) {
      setConfirmDelete(true);
      setTimeout(() => setConfirmDelete(false), 3000);
      return;
    }
    onDelete?.(student.id);
    setConfirmDelete(false);
  }

  const cardStyle = {
    display: 'flex',
    alignItems: compact ? 'center' : 'flex-start',
    gap: 'var(--space-md)',
    padding: compact ? 'var(--space-sm) var(--space-md)' : 'var(--space-md)',
    background: 'var(--surface-container-lowest)',
    borderRadius: 'var(--radius-md)',
    transition: 'background 0.15s',
    cursor: onClick ? 'pointer' : 'default',
  };

  return (
    <div
      style={cardStyle}
      className="ghost-border"
      onClick={onClick}
      onMouseEnter={e => { if (onClick) e.currentTarget.style.background = 'var(--surface-container-low)'; }}
      onMouseLeave={e => { if (onClick) e.currentTarget.style.background = 'var(--surface-container-lowest)'; }}
    >
      {/* Avatar */}
      <div
        className="student-avatar"
        style={{ opacity: student.is_paused ? 0.45 : 1, flexShrink: 0 }}
        aria-hidden="true"
      >
        {getInitials(student.full_name)}
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <span className="title-sm" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {student.full_name}
          </span>
          {student.is_paused && (
            <span className="chip chip-overdue">Paused</span>
          )}
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '2px', alignItems: 'center' }}>
          <span className="student-id-badge">{student.student_id}</span>
          {student.grade && (
            <span className="label-sm text-surface-variant">{student.grade}</span>
          )}
          {!compact && student.monthly_fee > 0 && (
            <span className="label-sm text-surface-variant">
              ₹{Number(student.monthly_fee).toLocaleString('en-IN')}/mo
            </span>
          )}
        </div>

        {!compact && student.parent_name && (
          <div className="label-sm text-surface-variant" style={{ marginTop: '2px' }}>
            Parent: {student.parent_name}
          </div>
        )}
      </div>

      {/* Right slot (e.g. fee toggle, radio buttons) */}
      {rightSlot && (
        <div style={{ flexShrink: 0 }} onClick={e => e.stopPropagation()}>
          {rightSlot}
        </div>
      )}

      {/* Action buttons (only shown when no rightSlot and handlers provided) */}
      {!rightSlot && (onEdit || onTogglePause || onDelete) && (
        <div
          style={{ display: 'flex', gap: '4px', flexShrink: 0 }}
          onClick={e => e.stopPropagation()}
        >
          {onEdit && (
            <button
              className="top-bar__icon-btn"
              onClick={() => onEdit(student)}
              title="Edit student"
              aria-label={`Edit ${student.full_name}`}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '1.125rem' }}>edit</span>
            </button>
          )}

          {onTogglePause && (
            <button
              className="top-bar__icon-btn"
              onClick={() => onTogglePause(student)}
              title={student.is_paused ? 'Resume account' : 'Pause account'}
              aria-label={`${student.is_paused ? 'Resume' : 'Pause'} ${student.full_name}`}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '1.125rem' }}>
                {student.is_paused ? 'play_circle' : 'pause_circle'}
              </span>
            </button>
          )}

          {onDelete && (
            <button
              className="top-bar__icon-btn"
              onClick={handleDelete}
              title={confirmDelete ? 'Tap again to confirm delete' : 'Delete student'}
              aria-label={`Delete ${student.full_name}`}
              style={{ color: confirmDelete ? 'var(--error)' : undefined }}
            >
              <span
                className="material-symbols-outlined"
                style={{ fontSize: '1.125rem', fontVariationSettings: confirmDelete ? "'FILL' 1" : "'FILL' 0" }}
              >
                delete
              </span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
