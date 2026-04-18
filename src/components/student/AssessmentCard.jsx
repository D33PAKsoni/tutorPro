// src/components/student/AssessmentCard.jsx
// Displays a single assessment result for the student

import { format } from 'date-fns';

const gradeColor = (p) =>
  p >= 75 ? 'var(--primary-fixed)' : p >= 45 ? 'var(--secondary-fixed)' : 'var(--tertiary-fixed)';

const gradeLabel = (p) =>
  p >= 90 ? 'A+' : p >= 75 ? 'A' : p >= 60 ? 'B' : p >= 45 ? 'C' : 'D';

/**
 * Props:
 *  - assessment: { id, title, subject, assessment_date, score, max_marks, teacher_remark }
 */
export default function AssessmentCard({ assessment: a }) {
  const p = Math.round((a.score / a.max_marks) * 100);

  return (
    <div className="card-item">
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
        {/* Grade badge */}
        <div style={{
          width: 52, height: 52, borderRadius: 'var(--radius-md)',
          background: gradeColor(p),
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', flexShrink: 0,
        }}>
          <span style={{
            fontFamily: 'var(--font-display)', fontWeight: 800,
            fontSize: '1.125rem', color: 'var(--primary)', lineHeight: 1,
          }}>
            {gradeLabel(p)}
          </span>
          <span className="label-sm" style={{ color: 'var(--on-surface-variant)' }}>{p}%</span>
        </div>

        <div style={{ flex: 1 }}>
          <div className="title-sm">{a.title || a.subject}</div>
          <div className="label-sm text-surface-variant">
            {a.subject} · {format(new Date(a.assessment_date), 'dd MMM yyyy')}
          </div>
          <div className="body-sm text-surface-variant" style={{ marginTop: 2 }}>
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, color: 'var(--primary)' }}>
              {a.score}
            </span>
            <span className="text-surface-variant"> / {a.max_marks}</span>
          </div>
        </div>
      </div>

      {a.teacher_remark && (
        <div style={{
          marginTop: 'var(--space-sm)', padding: 'var(--space-sm)',
          background: 'var(--surface-container-low)', borderRadius: 'var(--radius-md)',
          display: 'flex', gap: 'var(--space-xs)',
        }}>
          <span className="material-symbols-outlined" style={{ fontSize: '1rem', color: 'var(--on-surface-variant)', flexShrink: 0 }}>
            rate_review
          </span>
          <span className="body-sm text-surface-variant">{a.teacher_remark}</span>
        </div>
      )}
    </div>
  );
}
