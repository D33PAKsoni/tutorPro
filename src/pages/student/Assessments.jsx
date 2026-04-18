// src/pages/student/Assessments.jsx
import { useState, useEffect } from 'react';
import { supabase } from '../../supabase';
import { useStudent } from '../../context/StudentContext';
import TopBar from '../../components/shared/TopBar';
import BottomNav from '../../components/shared/BottomNav';
import PausedBanner from '../../components/shared/PausedBanner';
import AssessmentCard from '../../components/student/AssessmentCard';

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
            {filtered.map(a => (
              <AssessmentCard key={a.id} assessment={a} />
            ))}
          </div>
        )}
        <div style={{ height: 'var(--space-md)' }} />
      </main>
      <BottomNav role="student" />
    </div>
  );
}
