// src/components/teacher/AttendanceRadio.jsx
// The 4-option radio group for marking a single student's attendance status.
// Extracted as a reusable component used by the Attendance page.

const STATUSES = ['Present', 'Absent', 'Holiday', 'Extra Class'];

// Short labels for compact display
const SHORT_LABELS = {
  'Present': 'Present',
  'Absent': 'Absent',
  'Holiday': 'Holiday',
  'Extra Class': 'Extra',
};

// Per-status colors when selected
const SELECTED_STYLES = {
  'Present':     { background: 'var(--primary)',                  color: 'var(--on-primary)' },
  'Absent':      { background: 'var(--tertiary-container)',       color: 'var(--on-tertiary-container)' },
  'Holiday':     { background: 'var(--secondary-container)',      color: 'var(--on-secondary-fixed-variant)' },
  'Extra Class': { background: 'var(--primary-fixed)',            color: 'var(--on-primary-fixed-variant)' },
};

/**
 * AttendanceRadio
 * @param {string}   studentId   - Unique name-spacing for radio inputs
 * @param {string}   value       - Currently selected status
 * @param {function} onChange    - (status: string) => void
 * @param {boolean}  [disabled]  - Disables all options (e.g. while saving)
 */
export default function AttendanceRadio({ studentId, value, onChange, disabled = false }) {
  return (
    <div
      className="attendance-radio-group"
      role="radiogroup"
      aria-label="Attendance status"
    >
      {STATUSES.map(status => {
        const isChecked = value === status;
        const id = `att-${studentId}-${status.replace(/\s+/g, '-')}`;

        return (
          <div className="attendance-radio-option" key={status}>
            <input
              type="radio"
              id={id}
              name={`attendance-${studentId}`}
              value={status}
              checked={isChecked}
              onChange={() => !disabled && onChange(status)}
              disabled={disabled}
              aria-label={status}
            />
            <label
              htmlFor={id}
              data-status={status}
              style={isChecked ? SELECTED_STYLES[status] : undefined}
            >
              {SHORT_LABELS[status]}
            </label>
          </div>
        );
      })}
    </div>
  );
}
