// src/pages/student/Fees.jsx
// Students see fee status and due dates — but NOT payment history/ledger
import { useState, useEffect } from 'react';
import { supabase } from '../../supabase';
import { useStudent } from '../../context/StudentContext';
import TopBar from '../../components/shared/TopBar';
import BottomNav from '../../components/shared/BottomNav';
import PausedBanner from '../../components/shared/PausedBanner';
import { format, parseISO, isPast, startOfMonth, subMonths, addMonths } from 'date-fns';

export default function StudentFees() {
  const { activeStudent, isPaused } = useStudent();
  const [month, setMonth] = useState(startOfMonth(new Date()));
  const [fees, setFees] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activeStudent) return;
    setLoading(true);
    const monthStr = format(month, 'yyyy-MM-dd');
    supabase.from('fees').select('id, amount, due_date, status, month, remark')
      .eq('student_id', activeStudent.id).eq('month', monthStr)
      .then(({ data }) => { setFees(data || []); setLoading(false); });
  }, [activeStudent?.id, month]);

  return (
    <div className="page-wrapper">
      <TopBar title="Fees" backTo="/student" />
      <main className="container" style={{ paddingTop: 'var(--space-lg)' }}>
        {isPaused && <PausedBanner reason={activeStudent?.pause_reason} />}

        {/* Advance Deposit card — visible to student */}
        <div className="card ghost-border" style={{ marginBottom: 'var(--space-md)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div className="label-sm text-surface-variant">Advance Deposit</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 2, marginTop: 4 }}>
              <span className="label-sm text-surface-variant">₹</span>
              <span className="headline-sm text-primary">
                {activeStudent?.advance_balance?.toLocaleString('en-IN') || 0}
              </span>
            </div>
          </div>
          <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--secondary-container)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span className="material-symbols-outlined" style={{ color: 'var(--secondary)' }}>savings</span>
          </div>
        </div>

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
          <div className="card-list">{[1].map(i => <div key={i} className="card-item skeleton" style={{ height: 80 }} />)}</div>
        ) : fees.length === 0 ? (
          <div className="empty-state">
            <span className="material-symbols-outlined empty-state__icon">receipt_long</span>
            <div className="empty-state__title">No fee record for {format(month, 'MMMM')}</div>
          </div>
        ) : (
          <div className="card-list">
            {fees.map(fee => {
              const isOverdue = fee.status === 'Pending' && isPast(new Date(fee.due_date));
              return (
                <div key={fee.id} className="card-item">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: 4 }}>
                        <span className={`chip chip-${fee.status.toLowerCase()}`}>{fee.status}</span>
                        {isOverdue && <span className="chip chip-overdue">Overdue</span>}
                      </div>
                      <div className="title-sm">Monthly Tuition Fee</div>
                      <div className="label-sm text-surface-variant">Due: {format(parseISO(fee.due_date), 'dd MMMM yyyy')}</div>
                      {fee.remark && <div className="label-sm text-surface-variant" style={{ marginTop: 2 }}>{fee.remark}</div>}
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 2 }}>
                        <span className="label-sm text-surface-variant">₹</span>
                        <span className="headline-sm text-primary">{fee.amount?.toLocaleString('en-IN')}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Privacy note — no ledger shown */}
        <div style={{ marginTop: 'var(--space-lg)', padding: 'var(--space-md)', background: 'var(--surface-container-low)', borderRadius: 'var(--radius-md)', display: 'flex', gap: 'var(--space-sm)', alignItems: 'flex-start' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '1rem', color: 'var(--on-surface-variant)', flexShrink: 0 }}>info</span>
          <p className="body-sm text-surface-variant">Payment history is managed by your teacher. Contact them for payment receipts.</p>
        </div>

        <div style={{ height: 'var(--space-md)' }} />
      </main>
      <BottomNav role="student" />
    </div>
  );
}
