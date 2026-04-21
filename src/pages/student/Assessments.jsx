// src/pages/student/Assessments.jsx
import { useState, useEffect } from 'react';
import { supabase } from '../../supabase';
import { useStudent } from '../../context/StudentContext';
import TopBar from '../../components/shared/TopBar';
import BottomNav from '../../components/shared/BottomNav';
import PausedBanner from '../../components/shared/PausedBanner';
import { format } from 'date-fns';

export default function StudentAssessments() {
  const { activeStudent, isPaused } = useStudent();
  const [assessments, setAssessments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeSubject, setActiveSubject] = useState('All');

  useEffect(() => {
    if (!activeStudent) return;
    setLoading(true);
    supabase.from('assessments').select('*').eq('student_id', activeStudent.id)
      .order('assessment_date', { ascending: false })
      .then(({ data }) => { setAssessments(data || []); setLoading(false); });
  }, [activeStudent?.id]);

  const subjects = ['All', ...new Set(assessments.map(a => a.subject))];
  const filtered = activeSubject === 'All' ? assessments : assessments.filter(a => a.subject === activeSubject);

  const avgPct = filtered.length > 0
    ? Math.round(filtered.reduce((s, a) => s + (a.score / a.max_marks) * 100, 0) / filtered.length)
    : 0;

  const gradeColor = (p) => p >= 75 ? 'var(--primary-fixed)' : p >= 45 ? 'var(--secondary-fixed)' : 'var(--tertiary-fixed)';
  const gradeLabel = (p) => p >= 90 ? 'A+' : p >= 75 ? 'A' : p >= 60 ? 'B' : p >= 45 ? 'C' : 'D';

  return (
    <div className="page-wrapper">
      <TopBar title="Assessments" backTo="/student" />
      <main className="container" style={{ paddingTop: 'var(--space-lg)' }}>
        {isPaused && <PausedBanner reason={activeStudent?.pause_reason} />}

        {filtered.length > 0 && (
          <div className="hero-card" style={{ minHeight: 'auto', padding: 'var(--space-md) var(--space-lg)', marginBottom: 'var(--space-md)' }}>
            <div className="hero-card__eyebrow">Average Score — {activeSubject}</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
              <span className="display-lg" style={{ color: 'var(--on-primary)', fontSize: '3rem' }}>{avgPct}%</span>
              <span className="title-md" style={{ color: 'var(--on-primary-container)', opacity: 0.8 }}>overall</span>
            </div>
          </div>
        )}

        {subjects.length > 1 && (
          <div className="tabs" style={{ marginBottom: 'var(--space-md)' }}>
            {subjects.map(s => (
              <button key={s} className={`tab-btn${activeSubject === s ? ' tab-btn--active' : ''}`} onClick={() => setActiveSubject(s)}>
                {s}
              </button>
            ))}
          </div>
        )}

        {loading ? (
          <div className="card-list">{[1,2,3].map(i => <div key={i} className="card-item skeleton" style={{ height: 72 }} />)}</div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <span className="material-symbols-outlined empty-state__icon">assignment</span>
            <div className="empty-state__title">No assessments yet</div>
          </div>
        ) : (
          <div className="card-list">
            {filtered.map(a => {
              const p = Math.round((a.score / a.max_marks) * 100);
              return (
                <div key={a.id} className="card-item">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
                    <div style={{ width: 52, height: 52, borderRadius: 'var(--radius-md)', background: gradeColor(p), display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.125rem', color: 'var(--primary)', lineHeight: 1 }}>{gradeLabel(p)}</span>
                      <span className="label-sm" style={{ color: 'var(--on-surface-variant)' }}>{p}%</span>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div className="title-sm">{a.title || a.subject}</div>
                      <div className="label-sm text-surface-variant">{a.subject} · {format(new Date(a.assessment_date), 'dd MMM yyyy')}</div>
                      <div className="body-sm text-surface-variant" style={{ marginTop: 2 }}>
                        <span style={{ color: 'var(--on-surface-variant)' }}></span>
                        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, color: 'var(--primary)' }}> {a.score}</span>
                        <span className="text-surface-variant"> / {a.max_marks}</span>
                      </div>
                    </div>
                  </div>
                  {a.teacher_remark && (
                    <div style={{ marginTop: 'var(--space-sm)', padding: 'var(--space-sm)', background: 'var(--surface-container-low)', borderRadius: 'var(--radius-md)', display: 'flex', gap: 'var(--space-xs)' }}>
                      <span className="material-symbols-outlined" style={{ fontSize: '1rem', color: 'var(--on-surface-variant)', flexShrink: 0 }}>rate_review</span>
                      <span className="body-sm text-surface-variant">{a.teacher_remark}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
        <div style={{ height: 'var(--space-md)' }} />
      </main>
      <BottomNav role="student" />
    </div>
  );
}
