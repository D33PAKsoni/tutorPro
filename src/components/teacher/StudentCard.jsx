// src/components/teacher/StudentCard.jsx
// Reusable student list-item card used in the Students page

function getInitials(name = '') {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

/**
 * Props:
 *  - student: object from `students` table
 *  - onEdit(student): called when edit icon clicked
 *  - onTogglePause(student): called when pause/resume icon clicked
 *  - onDelete(student): called when delete icon clicked
 */
export default function StudentCard({ student, onEdit, onTogglePause, onDelete }) {
  return (
    <div
      className="card-item"
      style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}
    >
      <div className="student-avatar" style={{ opacity: student.is_paused ? 0.5 : 1 }}>
        {getInitials(student.full_name)}
      </div>

      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span className="title-sm">{student.full_name}</span>
          {student.is_paused && <span className="chip chip-overdue">Paused</span>}
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: 2 }}>
          <span className="student-id-badge">{student.student_id}</span>
          {student.grade && (
            <span className="label-sm text-surface-variant">{student.grade}</span>
          )}
          {student.monthly_fee > 0 && (
            <span className="label-sm text-surface-variant">
              ₹{student.monthly_fee?.toLocaleString('en-IN')}/mo
            </span>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 'var(--space-xs)' }}>
        <button
          className="btn-icon top-bar__icon-btn"
          onClick={() => onEdit?.(student)}
          title="Edit"
          aria-label={`Edit ${student.full_name}`}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '1.125rem' }}>edit</span>
        </button>
        <button
          className="btn-icon top-bar__icon-btn"
          onClick={() => onTogglePause?.(student)}
          title={student.is_paused ? 'Resume' : 'Pause'}
          aria-label={student.is_paused ? `Resume ${student.full_name}` : `Pause ${student.full_name}`}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '1.125rem' }}>
            {student.is_paused ? 'play_circle' : 'pause_circle'}
          </span>
        </button>
        <button
          className="btn-icon top-bar__icon-btn"
          onClick={() => onDelete?.(student)}
          title="Delete"
          aria-label={`Delete ${student.full_name}`}
          style={{ color: 'var(--error)' }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '1.125rem' }}>delete</span>
        </button>
      </div>
    </div>
  );
}
