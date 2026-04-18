// src/components/student/TodayCard.jsx
// Compact bento card showing today's attendance status and a notice count.
// Used on the student dashboard "Today's View" section.

import { format } from 'date-fns';

const STATUS_ICON = {
  'Present':     { icon: 'check_circle', color: 'var(--primary)' },
  'Absent':      { icon: 'cancel',       color: 'var(--tertiary)' },
  'Holiday':     { icon: 'beach_access', color: 'var(--secondary)' },
  'Extra Class': { icon: 'add_circle',   color: 'var(--primary)' },
};

/**
 * TodayCard
 * @param {object|null} todayAttendance  - Attendance record for today (or null)
 * @param {number}      noticeCount      - Number of unread/recent notices
 * @param {number}      pendingFeeCount  - Number of pending fee items
 */
export default function TodayCard({ todayAttendance, noticeCount = 0, pendingFeeCount = 0 }) {
  const today = format(new Date(), 'EEEE, d MMMM');
  const statusInfo = todayAttendance ? STATUS_ICON[todayAttendance.status] : null;

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 'var(--space-md)',
        marginBottom: 'var(--space-md)',
      }}
    >
      {/* Attendance card */}
      <div
        className="card ghost-border"
        style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xs)' }}
      >
        <span className="label-sm text-surface-variant">Attendance</span>
        <div style={{ marginTop: 'var(--space-sm)' }}>
          {todayAttendance ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
              <span
                className="material-symbols-outlined icon-filled"
                style={{ color: statusInfo?.color, fontSize: '1.25rem' }}
              >
                {statusInfo?.icon}
              </span>
              <span
                className="title-sm"
                style={{ color: statusInfo?.color }}
              >
                {todayAttendance.status}
              </span>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
              <div
                className="pulse-dot"
                style={{
                  width: 8, height: 8, borderRadius: '50%',
                  background: 'var(--primary)', flexShrink: 0,
                }}
              />
              <span className="title-sm text-primary">Pending</span>
            </div>
          )}
        </div>
        <span className="label-sm text-surface-variant" style={{ marginTop: 2 }}>
          {today}
        </span>
      </div>

      {/* Notices + fees summary card */}
      <div
        className="card ghost-border"
        style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xs)' }}
      >
        <span className="label-sm text-surface-variant">Updates</span>
        <div style={{ marginTop: 'var(--space-sm)', display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
            <span
              className="material-symbols-outlined icon-filled"
              style={{ fontSize: '1rem', color: 'var(--primary)' }}
            >
              campaign
            </span>
            <span className="title-sm text-primary">{noticeCount}</span>
            <span className="label-sm text-surface-variant">notice{noticeCount !== 1 ? 's' : ''}</span>
          </div>
          {pendingFeeCount > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
              <span
                className="material-symbols-outlined icon-filled"
                style={{ fontSize: '1rem', color: 'var(--tertiary)' }}
              >
                payments
              </span>
              <span className="title-sm" style={{ color: 'var(--tertiary)' }}>{pendingFeeCount}</span>
              <span className="label-sm text-surface-variant">due</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
