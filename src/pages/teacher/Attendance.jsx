// src/pages/teacher/Attendance.jsx
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../supabase';
import { useAuth } from '../../context/AuthContext';
import TopBar from '../../components/shared/TopBar';
import BottomNav from '../../components/shared/BottomNav';
import { format, parseISO } from 'date-fns';

const STATUSES = ['Present', 'Absent', 'Holiday', 'Extra Class'];

function getInitials(name = '') {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

export default function TeacherAttendance() {
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [students, setStudents] = useState([]);
  const [attendance, setAttendance] = useState({}); // { studentId: status }
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState(null);

  const loadData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      // Load active (non-paused) students
      const { data: studs } = await supabase
        .from('students')
        .select('id, full_name, student_id, grade')
        .eq('teacher_id', user.id)
        .eq('is_paused', false)
        .order('full_name');

      // Load existing attendance for selected date
      const { data: existing } = await supabase
        .from('attendance')
        .select('student_id, status')
        .eq('teacher_id', user.id)
        .eq('date', selectedDate);

      const attMap = {};
      (existing || []).forEach(a => { attMap[a.student_id] = a.status; });

      setStudents(studs || []);
      setAttendance(attMap);
    } finally {
      setLoading(false);
    }
  }, [user, selectedDate]);

  useEffect(() => { loadData(); }, [loadData]);

  function handleStatusChange(studentId, status) {
    setAttendance(prev => ({ ...prev, [studentId]: status }));
  }

  async function handleSave() {
    if (!user) return;
    setSaving(true);
    try {
      const rows = students.map(s => ({
        teacher_id: user.id,
        student_id: s.id,
        date: selectedDate,
        status: attendance[s.id] || 'Present',
      }));

      const { error } = await supabase
        .from('attendance')
        .upsert(rows, { onConflict: 'teacher_id,student_id,date' });

      if (!error) setSavedAt(new Date());
    } finally {
      setSaving(false);
    }
  }

  const markedCount = Object.keys(attendance).length;
  const presentCount = Object.values(attendance).filter(s => s === 'Present').length;

  return (
    <div className="page-wrapper">
      <TopBar
        title="Attendance"
        backTo="/teacher"
        actions={
          <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={saving || loading}>
            {saving ? <div className="spinner spinner--sm" /> : (
              <>
                <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>save</span>
                Save
              </>
            )}
          </button>
        }
      />

      <main className="container" style={{ paddingTop: 'var(--space-lg)' }}>

        {/* Date Selector */}
        <div className="card ghost-border" style={{ marginBottom: 'var(--space-md)', display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
          <span className="material-symbols-outlined" style={{ color: 'var(--primary)' }}>calendar_today</span>
          <div style={{ flex: 1 }}>
            <div className="label-sm text-surface-variant">Attendance Date</div>
            <input
              type="date"
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: '1rem',
                fontWeight: 700,
                color: 'var(--primary)',
                background: 'transparent',
                border: 'none',
                outline: 'none',
                cursor: 'pointer',
                width: '100%',
              }}
            />
          </div>
        </div>

        {/* Summary chips */}
        {markedCount > 0 && (
          <div style={{ display: 'flex', gap: 'var(--space-xs)', marginBottom: 'var(--space-md)', flexWrap: 'wrap' }}>
            <span className="chip chip-present">{presentCount} Present</span>
            <span className="chip chip-absent">{Object.values(attendance).filter(s => s === 'Absent').length} Absent</span>
            <span className="chip chip-holiday">{Object.values(attendance).filter(s => s === 'Holiday').length} Holiday</span>
            <span className="chip chip-extra">{Object.values(attendance).filter(s => s === 'Extra Class').length} Extra</span>
          </div>
        )}

        {savedAt && (
          <div style={{ fontSize: '0.75rem', color: 'var(--secondary)', marginBottom: 'var(--space-sm)', display: 'flex', alignItems: 'center', gap: 4 }}>
            <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>check_circle</span>
            Saved at {format(savedAt, 'hh:mm a')}
          </div>
        )}

        {/* Student List */}
        {loading ? (
          <div className="card-list">
            {[1,2,3,4,5].map(i => (
              <div key={i} className="card-item" style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <div className="skeleton" style={{ width: 40, height: 40, borderRadius: '50%', flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div className="skeleton" style={{ width: '50%', height: 14, marginBottom: 8 }} />
                  <div className="skeleton" style={{ height: 36, borderRadius: 'var(--radius-md)' }} />
                </div>
              </div>
            ))}
          </div>
        ) : students.length === 0 ? (
          <div className="empty-state">
            <span className="material-symbols-outlined empty-state__icon">groups</span>
            <div className="empty-state__title">No active students</div>
            <div className="empty-state__body">Add students or unpause paused accounts to mark attendance</div>
          </div>
        ) : (
          <div className="card-list">
            {students.map((student, idx) => (
              <div
                key={student.id}
                className="card-item animate-fade-up"
                style={{ animationDelay: `${idx * 40}ms` }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)', marginBottom: 'var(--space-sm)' }}>
                  <div className="student-avatar">{getInitials(student.full_name)}</div>
                  <div style={{ flex: 1 }}>
                    <div className="title-sm">{student.full_name}</div>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <span className="student-id-badge">{student.student_id}</span>
                      {student.grade && <span className="label-sm text-surface-variant">{student.grade}</span>}
                    </div>
                  </div>
                </div>

                {/* Radio status group */}
                <div className="attendance-radio-group">
                  {STATUSES.map(status => (
                    <div className="attendance-radio-option" key={status}>
                      <input
                        type="radio"
                        id={`${student.id}-${status}`}
                        name={`attendance-${student.id}`}
                        value={status}
                        checked={attendance[student.id] === status}
                        onChange={() => handleStatusChange(student.id, status)}
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
            ))}
          </div>
        )}

        <div style={{ height: 'var(--space-md)' }} />
      </main>

      <BottomNav role="teacher" />
    </div>
  );
}
