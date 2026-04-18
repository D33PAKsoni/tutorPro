// src/components/teacher/AttendanceRadio.jsx
// Radio button group for marking a single student's attendance status

const STATUSES = ['Present', 'Absent', 'Holiday', 'Extra Class'];

function getInitials(name = '') {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

/**
 * Props:
 *  - student: { id, full_name, student_id, grade }
 *  - value: current status string (or undefined)
 *  - onChange(studentId, status): called when a radio is selected
 *  - index: used for staggered animation delay
 */
export default function AttendanceRadio({ student, value, onChange, index = 0 }) {
  return (
    <div
      className="card-item animate-fade-up"
      style={{ animationDelay: `${index * 40}ms` }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)', marginBottom: 'var(--space-sm)' }}>
        <div className="student-avatar">{getInitials(student.full_name)}</div>
        <div style={{ flex: 1 }}>
          <div className="title-sm">{student.full_name}</div>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <span className="student-id-badge">{student.student_id}</span>
            {student.grade && (
              <span className="label-sm text-surface-variant">{student.grade}</span>
            )}
          </div>
        </div>
      </div>

      <div className="attendance-radio-group">
        {STATUSES.map(status => (
          <div className="attendance-radio-option" key={status}>
            <input
              type="radio"
              id={`${student.id}-${status}`}
              name={`attendance-${student.id}`}
              value={status}
              checked={value === status}
              onChange={() => onChange?.(student.id, status)}
            />
            <label
              htmlFor={`${student.id}-${status}`}
              data-status={status}
            >
              {status === 'Extra Class' ? 'Extra' : status}
            </label>
          </div>
        ))}
      </div>
    </div>
  );
}
