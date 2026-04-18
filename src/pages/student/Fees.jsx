// src/pages/student/Fees.jsx
import { useState } from 'react';
import { useStudent } from '../../context/StudentContext';
import TopBar from '../../components/shared/TopBar';
import BottomNav from '../../components/shared/BottomNav';
import PausedBanner from '../../components/shared/PausedBanner';
import FeeCard from '../../components/student/FeeCard';
import { useStudentFees } from '../../hooks/useFees';
import { format, startOfMonth, subMonths, addMonths } from 'date-fns';

export default function StudentFees() {
  const { activeStudent, isPaused } = useStudent();
  const [month, setMonth] = useState(startOfMonth(new Date()));
  const { fees, loading, overdueFees, pendingFees } = useStudentFees(activeStudent?.id, month);

  return (
    <div className="page-wrapper">
      <TopBar title="Fees" backTo="/student" />
      <main className="container" style={{ paddingTop: 'var(--space-lg)' }}>
        {isPaused && <PausedBanner reason={activeStudent?.pause_reason} />}

        {/* Advance Deposit card — visible to student, no payment history */}
        <div className="card ghost-border" style={{ marginBottom: 'var(--space-md)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div className="label-sm text-surface-variant">Advance Deposit</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 2, marginTop: 4 }}>
              <span className="label-sm text-surface-variant">₹</span>
              <span className="headline-sm text-primary">
                {Number(activeStudent?.advance_balance || 0).toLocaleString('en-IN')}
              </span>
            </div>
          </div>
          <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--secondary-container)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span className="material-symbols-outlined" style={{ color: 'var(--secondary)' }}>savings</span>
          </div>
        </div>

        {/* Overdue alert banner */}
        {overdueFees.length > 0 && (
          <div style={{ background: 'var(--tertiary-fixed)', color: 'var(--on-tertiary-fixed-variant)', padding: 'var(--space-sm) var(--space-md)', borderRadius: 'var(--radius-lg)', marginBottom: 'var(--space-md)', display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
            <span className="material-symbols-outlined icon-filled" style={{ fontSize: '1.125rem' }}>warning</span>
            <span className="label-md">
              {overdueFees.length} overdue fee{overdueFees.length > 1 ? 's' : ''} — contact your teacher
            </span>
          </div>
        )}

        {/* Month Navigator */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-md)' }}>
          <button className="top-bar__icon-btn" onClick={() => setMonth(m => subMonths(m, 1))}>
            <span className="material-symbols-outlined">chevron_left</span>
          </button>
          <span className="headline-sm text-primary">{format(month, 'MMMM yyyy')}</span>
          <button className="top-bar__icon-btn" onClick={() => setMonth(m => addMonths(m, 1))}>
            <span className="material-symbols-outlined">chevron_right</span>
          </button>
        </div>

        {loading ? (
          <div className="card-list">
            {[1].map(i => <div key={i} className="card-item skeleton" style={{ height: 90 }} />)}
          </div>
        ) : fees.length === 0 ? (
          <div className="empty-state">
            <span className="material-symbols-outlined empty-state__icon">receipt_long</span>
            <div className="empty-state__title">No fee record for {format(month, 'MMMM')}</div>
            <div className="empty-state__body">Your teacher hasn't generated fees for this month yet</div>
          </div>
        ) : (
          <div className="card-list">
            {fees.map(fee => <FeeCard key={fee.id} fee={fee} />)}
          </div>
        )}

        {/* Privacy note — no ledger shown to student */}
        <div style={{ marginTop: 'var(--space-lg)', padding: 'var(--space-md)', background: 'var(--surface-container-low)', borderRadius: 'var(--radius-md)', display: 'flex', gap: 'var(--space-sm)', alignItems: 'flex-start' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '1rem', color: 'var(--on-surface-variant)', flexShrink: 0 }}>info</span>
          <p className="body-sm text-surface-variant">Payment history is managed by your teacher. Contact them for receipts or payment confirmation.</p>
        </div>

        <div style={{ height: 'var(--space-md)' }} />
      </main>
      <BottomNav role="student" />
    </div>
  );
}
