// src/components/student/TodayCard.jsx
// Shows today's attendance status and advance balance on the student dashboard

import { format } from 'date-fns';

/**
 * Props:
 *  - student: active student record
 *  - attendance: { status, remark } | null — today's record
 *  - loading: boolean
 */
export default function TodayCard({ student, attendance, loading }) {
  return (
    <div
      className="hero-card animate-fade-up"
      style={{ marginBottom: 'var(--space-md)', minHeight: 'auto', padding: 'var(--space-lg)' }}
    >
      <div className="hero-card__eyebrow">
        Today, {format(new Date(), 'EEEE d MMM')}
      </div>
      <div className="hero-card__title">
        Hi, {student?.full_name?.split(' ')[0] || 'Student'}!
      </div>

      <div style={{ display: 'flex', gap: 'var(--space-xl)', marginTop: 'var(--space-md)' }}>
        <div>
          {loading ? (
            <div className="skeleton" style={{ width: 100, height: 32, marginBottom: 4 }} />
          ) : (
            <div className="hero-stat__number" style={{ fontSize: '1.5rem' }}>
              {attendance?.status || 'Not marked'}
            </div>
          )}
          <div className="hero-stat__label">Today's Status</div>
        </div>

        <div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 2 }}>
            <span className="hero-stat__currency">₹</span>
            {loading ? (
              <div className="skeleton" style={{ width: 60, height: 32 }} />
            ) : (
              <span className="hero-stat__number" style={{ fontSize: '1.5rem' }}>
                {student?.advance_balance?.toLocaleString('en-IN') || 0}
              </span>
            )}
          </div>
          <div className="hero-stat__label">Advance Deposit</div>
        </div>
      </div>

      <span className="material-symbols-outlined hero-card__bg-icon">school</span>
    </div>
  );
}
