// src/pages/student/Attendance.jsx
import { useState, useEffect } from 'react';
import { supabase } from '../../supabase';
import { useStudent } from '../../context/StudentContext';
import TopBar from '../../components/shared/TopBar';
import BottomNav from '../../components/shared/BottomNav';
import PausedBanner from '../../components/shared/PausedBanner';
import { format, parseISO, startOfMonth, subMonths, addMonths } from 'date-fns';

export function StudentAttendance() {
  const { activeStudent, isPaused } = useStudent();
  const [month, setMonth] = useState(startOfMonth(new Date()));
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activeStudent) return;
    setLoading(true);
    const from = format(month, 'yyyy-MM-01');
    const to = format(new Date(month.getFullYear(), month.getMonth() + 1, 0), 'yyyy-MM-dd');
    supabase.from('attendance').select('*').eq('student_id', activeStudent.id).gte('date', from).lte('date', to).order('date', { ascending: false })
      .then(({ data }) => { setRecords(data || []); setLoading(false); });
  }, [activeStudent?.id, month]);

  const stats = {
    Present: records.filter(r => r.status === 'Present').length,
    Absent: records.filter(r => r.status === 'Absent').length,
    Holiday: records.filter(r => r.status === 'Holiday').length,
    'Extra Class': records.filter(r => r.status === 'Extra Class').length,
  };
  const pct = records.length > 0 ? Math.round((stats.Present / records.length) * 100) : 0;

  return (
    <div className="page-wrapper">
      <TopBar title="Attendance" backTo="/student" />
      <main className="container" style={{ paddingTop: 'var(--space-lg)' }}>
        {isPaused && <PausedBanner reason={activeStudent?.pause_reason} />}

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-md)' }}>
          <button className="top-bar__icon-btn" onClick={() => setMonth(m => subMonths(m, 1))}>
            <span className="material-symbols-outlined">chevron_left</span>
          </button>
          <span className="headline-sm text-primary">{format(month, 'MMMM yyyy')}</span>
          <button className="top-bar__icon-btn" onClick={() => setMonth(m => addMonths(m, 1))}>
            <span className="material-symbols-outlined">chevron_right</span>
          </button>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--space-sm)', marginBottom: 'var(--space-md)' }}>
          {Object.entries(stats).map(([k, v]) => (
            <div key={k} className="card" style={{ textAlign: 'center', background: k === 'Present' ? 'var(--primary-fixed)' : k === 'Absent' ? 'var(--tertiary-fixed)' : 'var(--surface-container-low)' }}>
              <div className="headline-sm text-primary">{v}</div>
              <div className="label-sm text-surface-variant">{k === 'Extra Class' ? 'Extra' : k}</div>
            </div>
          ))}
        </div>

        {records.length > 0 && (
          <div className="card" style={{ background: 'var(--primary-gradient)', marginBottom: 'var(--space-md)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div className="label-sm" style={{ color: 'var(--on-primary-container)', opacity: 0.8 }}>Attendance Rate</div>
              <div className="display-lg" style={{ color: 'var(--on-primary)', fontSize: '2.5rem' }}>{pct}%</div>
            </div>
            <span className="material-symbols-outlined" style={{ fontSize: '4rem', opacity: 0.15, color: 'var(--on-primary)' }}>pie_chart</span>
          </div>
        )}

        {loading ? (
          <div className="card-list">{[1,2,3,4].map(i => <div key={i} className="card-item skeleton" style={{ height: 56 }} />)}</div>
        ) : records.length === 0 ? (
          <div className="empty-state">
            <span className="material-symbols-outlined empty-state__icon">event_busy</span>
            <div className="empty-state__title">No records for {format(month, 'MMMM')}</div>
          </div>
        ) : (
          <div className="card-list">
            {records.map(r => (
              <div key={r.id} className="card-item" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
                <div style={{ flex: 1 }}>
                  <div className="title-sm">{format(parseISO(r.date), 'EEEE, dd MMM')}</div>
                  {r.remark && <div className="label-sm text-surface-variant">{r.remark}</div>}
                </div>
                <span className={`chip chip-${r.status.toLowerCase().replace(' ', '-')}`}>{r.status}</span>
              </div>
            ))}
          </div>
        )}
      </main>
      <BottomNav role="student" />
    </div>
  );
}
export default StudentAttendance;

// ---- Student Fees View ---- (no payment ledger shown)
// src/pages/student/Fees.jsx — exported separately below
