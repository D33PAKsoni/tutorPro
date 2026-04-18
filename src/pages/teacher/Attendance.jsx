// src/pages/teacher/Attendance.jsx
import { useState } from 'react';
import TopBar from '../../components/shared/TopBar';
import BottomNav from '../../components/shared/BottomNav';
import StudentCard from '../../components/teacher/StudentCard';
import AttendanceRadio from '../../components/teacher/AttendanceRadio';
import { useAttendance } from '../../hooks/useAttendance';
import { format } from 'date-fns';

export default function TeacherAttendance() {
  const {
    date, setDate,
    students, statusMap, setStatus,
    loading, saving, savedAt,
    saveAll, stats, markAll,
  } = useAttendance();

  return (
    <div className="page-wrapper">
      <TopBar
        title="Attendance"
        backTo="/teacher"
        actions={
          <button className="btn btn-primary btn-sm" onClick={saveAll} disabled={saving || loading}>
            {saving ? <div className="spinner spinner--sm" /> : (
              <><span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>save</span>Save</>
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
              value={date}
              onChange={e => setDate(e.target.value)}
              style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', fontWeight: 700, color: 'var(--primary)', background: 'transparent', border: 'none', outline: 'none', cursor: 'pointer', width: '100%' }}
            />
          </div>
        </div>

        {/* Summary chips */}
        {stats.marked > 0 && (
          <div style={{ display: 'flex', gap: 'var(--space-xs)', marginBottom: 'var(--space-md)', flexWrap: 'wrap', alignItems: 'center' }}>
            <span className="chip chip-present">{stats.present} Present</span>
            <span className="chip chip-absent">{stats.absent} Absent</span>
            <span className="chip chip-holiday">{stats.holiday} Holiday</span>
            <span className="chip chip-extra">{stats.extra} Extra</span>
            <button className="btn btn-tertiary btn-sm" style={{ marginLeft: 'auto' }} onClick={() => markAll('Present')}>
              Mark All Present
            </button>
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
            <div className="empty-state__body">All students are paused or none have been added yet</div>
          </div>
        ) : (
          <div className="card-list">
            {students.map((student, idx) => (
              <div
                key={student.id}
                className="card-item animate-fade-up"
                style={{ animationDelay: `${idx * 30}ms` }}
              >
                {/* Student info row */}
                <div style={{ marginBottom: 'var(--space-sm)' }}>
                  <StudentCard
                    student={student}
                    compact
                    rightSlot={null}
                  />
                </div>
                {/* Status radio row */}
                <AttendanceRadio
                  studentId={student.id}
                  value={statusMap[student.id] || ''}
                  onChange={status => setStatus(student.id, status)}
                  disabled={saving}
                />
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
