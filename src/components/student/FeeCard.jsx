// src/components/student/FeeCard.jsx
// Displays a single fee record for the student (status, amount, due date — no ledger)

import { format, parseISO, isPast } from 'date-fns';

/**
 * Props:
 *  - fee: { id, amount, due_date, status, remark }
 */
export default function FeeCard({ fee }) {
  const isOverdue = fee.status === 'Pending' && isPast(new Date(fee.due_date));

  return (
    <div className="card-item">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: 4 }}>
            <span className={`chip chip-${fee.status.toLowerCase()}`}>{fee.status}</span>
            {isOverdue && <span className="chip chip-overdue">Overdue</span>}
          </div>
          <div className="title-sm">Monthly Tuition Fee</div>
          <div className="label-sm text-surface-variant">
            Due: {format(parseISO(fee.due_date), 'dd MMMM yyyy')}
          </div>
          {fee.remark && (
            <div className="label-sm text-surface-variant" style={{ marginTop: 2 }}>
              {fee.remark}
            </div>
          )}
        </div>

        <div style={{ textAlign: 'right' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 2 }}>
            <span className="label-sm text-surface-variant">₹</span>
            <span className="headline-sm text-primary">
              {fee.amount?.toLocaleString('en-IN')}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
