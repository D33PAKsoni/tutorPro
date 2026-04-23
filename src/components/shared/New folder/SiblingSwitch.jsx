// src/components/shared/SiblingSwitch.jsx
// Bottom sheet modal to switch between linked student accounts (no re-auth)

import { useStudent } from '../../context/StudentContext';

function getInitials(name = '') {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

export default function SiblingSwitch({ onClose }) {
  const { linkedStudents, activeStudentId, switchToStudent } = useStudent();

  function handleSwitch(id) {
    switchToStudent(id);
    onClose?.();
  }

  // No modal needed if only one account
  if (linkedStudents.length <= 1) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet sibling-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-handle" />
        <div className="sibling-modal__title">Switch Account</div>

        {linkedStudents.map((student) => {
          const isActive = student.id === activeStudentId;
          return (
            <button
              key={student.id}
              className={`sibling-item${isActive ? ' sibling-item--active' : ''}`}
              onClick={() => handleSwitch(student.id)}
              style={{ width: '100%', textAlign: 'left', fontFamily: 'inherit' }}
            >
              <div className="sibling-item__avatar">
                {getInitials(student.full_name)}
              </div>
              <div style={{ flex: 1 }}>
                <div className="sibling-item__name">{student.full_name}</div>
                <div className="sibling-item__id">
                  <span className="student-id-badge">{student.student_id}</span>
                  {student.is_paused && (
                    <span style={{ marginLeft: '0.5rem', fontSize: '0.7rem', color: 'var(--tertiary)' }}>
                      Paused
                    </span>
                  )}
                </div>
              </div>
              {isActive && (
                <span className="material-symbols-outlined icon-filled" style={{ color: 'var(--primary)' }}>
                  check_circle
                </span>
              )}
            </button>
          );
        })}

        <button className="btn btn-tertiary" style={{ width: '100%', marginTop: '0.5rem' }} onClick={onClose}>
          Cancel
        </button>
      </div>
    </div>
  );
}
