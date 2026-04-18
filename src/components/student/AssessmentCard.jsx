// src/components/student/AssessmentCard.jsx
// Displays a single assessment record for the student.
// Shows grade badge, percentage, score, subject, date, and teacher remark.

import { format } from 'date-fns';

function gradeLabel(pct) {
  if (pct >= 90) return 'A+';
  if (pct >= 75) return 'A';
  if (pct >= 60) return 'B';
  if (pct >= 45) return 'C';
  return 'D';
}

function gradeColors(pct) {
  if (pct >= 75) return { bg: 'var(--primary-fixed)',   text: 'var(--primary)' };
  if (pct >= 45) return { bg: 'var(--secondary-fixed)', text: 'var(--secondary)' };
  return            { bg: 'var(--tertiary-fixed)',   text: 'var(--on-tertiary-fixed-variant)' };
}

/**
 * AssessmentCard
 * @param {object} assessment - Assessment row from DB
 */
export default function AssessmentCard({ assessment: a }) {
  const pct = a.max_marks > 0 ? Math.round((a.score / a.max_marks) * 100) : 0;
  const grade = gradeLabel(pct);
  const { bg, text } = gradeColors(pct);

  return (
    <div className="card-item ghost-border">
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>

        {/* Grade badge */}
        <div style={{
          width: 52,
          height: 52,
          borderRadius: 'var(--radius-md)',
          background: bg,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          gap: 0,
        }}>
          <span style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 800,
            fontSize: '1.125rem',
            color: text,
            lineHeight: 1,
          }}>
            {grade}
          </span>
          <span className="label-sm" style={{ color: text, opacity: 0.8 }}>
            {pct}%
          </span>
        </div>

        {/* Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Title / Subject */}
          <div className="title-sm" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {a.title || a.subject}
          </div>

          {/* Subject + Date */}
          <div className="label-sm text-surface-variant" style={{ marginTop: 2 }}>
            {a.subject} &middot; {format(new Date(a.assessment_date), 'dd MMM yyyy')}
          </div>

          {/* Score */}
          <div style={{ marginTop: 2, display: 'flex', alignItems: 'baseline', gap: 2 }}>
            <span className="label-sm text-surface-variant">₹</span>
            {/* Using non-currency display intentionally styled like data */}
            <span
              className="title-sm"
              style={{ color: 'var(--primary)', fontFamily: 'var(--font-display)' }}
            >
              {a.score}
            </span>
            <span className="label-sm text-surface-variant">
              / {a.max_marks} marks
            </span>
          </div>
        </div>
      </div>

      {/* Teacher remark */}
      {a.teacher_remark && (
        <div style={{
          marginTop: 'var(--space-sm)',
          padding: 'var(--space-sm) var(--space-md)',
          background: 'var(--surface-container-low)',
          borderRadius: 'var(--radius-md)',
          display: 'flex',
          gap: 'var(--space-xs)',
          alignItems: 'flex-start',
        }}>
          <span
            className="material-symbols-outlined"
            style={{ fontSize: '1rem', color: 'var(--on-surface-variant)', flexShrink: 0, marginTop: 1 }}
          >
            rate_review
          </span>
          <span className="body-sm text-surface-variant" style={{ lineHeight: 1.5 }}>
            {a.teacher_remark}
          </span>
        </div>
      )}
    </div>
  );
}
