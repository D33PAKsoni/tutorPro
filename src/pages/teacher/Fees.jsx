// src/pages/teacher/Fees.jsx
import { useState } from 'react';
import { supabase } from '../../supabase';
import { useAuth } from '../../context/AuthContext';
import TopBar from '../../components/shared/TopBar';
import BottomNav from '../../components/shared/BottomNav';
import FeeToggle from '../../components/teacher/FeeToggle';
import StudentCard from '../../components/teacher/StudentCard';
import { useTeacherFees } from '../../hooks/useFees';
import { format, parseISO, startOfMonth, subMonths, addMonths } from 'date-fns';

export default function TeacherFees() {
  const { user } = useAuth();
  const [month, setMonth] = useState(startOfMonth(new Date()));
  const [editFee, setEditFee] = useState(null);
  const { fees, loading, generating, summary, togglePaid, generateFees, refresh } = useTeacherFees(month);

  return (
    <div className="page-wrapper">
      <TopBar
        title="Fees"
        backTo="/teacher"
        actions={
          <button className="btn btn-secondary btn-sm" onClick={generateFees} disabled={generating}>
            {generating ? <div className="spinner spinner--sm" /> : (
              <>
                <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>auto_awesome</span>
                Generate
              </>
            )}
          </button>
        }
      />

      <main className="container" style={{ paddingTop: 'var(--space-lg)' }}>

        {/* Month Navigator */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-md)' }}>
          <button className="top-bar__icon-btn" onClick={() => setMonth(m => subMonths(m, 1))}>
            <span className="material-symbols-outlined">chevron_left</span>
          </button>
          <div style={{ textAlign: 'center' }}>
            <div className="headline-sm text-primary">{format(month, 'MMMM yyyy')}</div>
          </div>
          <button className="top-bar__icon-btn" onClick={() => setMonth(m => addMonths(m, 1))}>
            <span className="material-symbols-outlined">chevron_right</span>
          </button>
        </div>

        {/* Summary Row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-sm)', marginBottom: 'var(--space-md)' }}>
          <div className="hero-card" style={{ minHeight: 100, padding: 'var(--space-md)' }}>
            <div className="hero-card__eyebrow">Collected</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 2 }}>
              <span style={{ fontSize: '1rem', fontWeight: 700, opacity: 0.6, color: 'var(--on-primary)' }}>₹</span>
              <span className="headline-sm" style={{ color: 'var(--on-primary)' }}>
                {summary.collected.toLocaleString('en-IN')}
              </span>
            </div>
            <div className="label-sm" style={{ opacity: 0.8, color: 'var(--on-primary-container)' }}>
              of ₹{summary.total.toLocaleString('en-IN')}
            </div>
          </div>
          <div className="card" style={{ background: 'var(--tertiary-fixed)' }}>
            <div className="label-sm text-surface-variant">Pending / Overdue</div>
            <div className="headline-sm" style={{ color: 'var(--on-tertiary-fixed-variant)', marginTop: 4 }}>
              {summary.pending} <span style={{ fontSize: '1rem' }}>pending</span>
            </div>
            {summary.overdue > 0 && (
              <div className="label-sm" style={{ color: 'var(--tertiary)', marginTop: 2 }}>
                {summary.overdue} overdue
              </div>
            )}
          </div>
        </div>

        {/* Fee List */}
        {loading ? (
          <div className="card-list">
            {[1,2,3,4].map(i => (
              <div key={i} className="card-item" style={{ display: 'flex', gap: '1rem' }}>
                <div className="skeleton" style={{ width: 40, height: 40, borderRadius: '50%', flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div className="skeleton" style={{ width: '50%', height: 14, marginBottom: 6 }} />
                  <div className="skeleton" style={{ width: '30%', height: 12 }} />
                </div>
                <div className="skeleton" style={{ width: 44, height: 24, borderRadius: '999px' }} />
              </div>
            ))}
          </div>
        ) : fees.length === 0 ? (
          <div className="empty-state">
            <span className="material-symbols-outlined empty-state__icon">receipt_long</span>
            <div className="empty-state__title">No fees for {format(month, 'MMMM')}</div>
            <div className="empty-state__body">Click "Generate" to auto-create fees for all active students</div>
            <button className="btn btn-primary" onClick={generateFees}>Generate Fees</button>
          </div>
        ) : (
          <div className="card-list">
            {fees.map(fee => {
              const isOverdue = fee.status === 'Pending' && new Date(fee.due_date) < new Date();
              return (
                <div key={fee.id} className="card-item" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
                  <StudentCard
                    student={fee.students || { full_name: 'Unknown', student_id: '—' }}
                    compact
                    onClick={() => setEditFee(fee)}
                    rightSlot={
                      <FeeToggle fee={fee} onToggle={togglePaid} />
                    }
                  />
                </div>
              );
            })}
          </div>
        )}
      </main>

      <BottomNav role="teacher" />

      {editFee && (
        <FeeDetailModal fee={editFee} onClose={() => setEditFee(null)} onSaved={() => { setEditFee(null); loadFees(); }} />
      )}
    </div>
  );
}

function FeeDetailModal({ fee, onClose, onSaved }) {
  const [form, setForm] = useState({
    amount: fee.amount,
    due_date: fee.due_date,
    status: fee.status,
    paid_amount: fee.paid_amount || 0,
    remark: fee.remark || '',
  });
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    await supabase.from('fees').update({
      amount: parseFloat(form.amount),
      due_date: form.due_date,
      status: form.status,
      paid_amount: parseFloat(form.paid_amount) || 0,
      paid_date: form.status === 'Paid' ? format(new Date(), 'yyyy-MM-dd') : null,
      remark: form.remark,
    }).eq('id', fee.id);
    setSaving(false);
    onSaved();
  }

  // Update advance balance separately
  async function updateAdvance(newBalance) {
    await supabase.from('students').update({ advance_balance: parseFloat(newBalance) || 0 }).eq('id', fee.student_id);
    onSaved();
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" onClick={e => e.stopPropagation()}>
        <div className="modal-handle" />
        <div className="modal-title">Edit Fee — {fee.students?.full_name}</div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-sm)' }}>
          <div className="field">
            <label className="field__label">Amount (₹)</label>
            <input className="field__input" type="number" value={form.amount} onChange={e => setForm(p => ({...p, amount: e.target.value}))} />
          </div>
          <div className="field">
            <label className="field__label">Due Date</label>
            <input className="field__input" type="date" value={form.due_date} onChange={e => setForm(p => ({...p, due_date: e.target.value}))} />
          </div>
        </div>

        <div className="field">
          <label className="field__label">Status</label>
          <select className="field__input field__select" value={form.status} onChange={e => setForm(p => ({...p, status: e.target.value}))}>
            <option>Pending</option>
            <option>Paid</option>
            <option>Partial</option>
            <option>Waived</option>
          </select>
        </div>

        {form.status === 'Partial' && (
          <div className="field">
            <label className="field__label">Paid Amount (₹)</label>
            <input className="field__input" type="number" value={form.paid_amount} onChange={e => setForm(p => ({...p, paid_amount: e.target.value}))} />
          </div>
        )}

        <div className="field">
          <label className="field__label">Remark</label>
          <input className="field__input" value={form.remark} onChange={e => setForm(p => ({...p, remark: e.target.value}))} placeholder="Optional note..." />
        </div>

        {/* Advance balance — manual reference only */}
        <div className="card" style={{ background: 'var(--secondary-fixed)', marginBottom: 'var(--space-md)' }}>
          <div className="label-sm text-surface-variant" style={{ marginBottom: 4 }}>
            Advance Deposit (Reference — manual update only)
          </div>
          <div style={{ display: 'flex', gap: 'var(--space-sm)', alignItems: 'center' }}>
            <span className="title-md text-primary">₹{fee.students?.advance_balance?.toLocaleString('en-IN') || 0}</span>
            <input
              className="field__input"
              type="number"
              placeholder="Update balance"
              style={{ flex: 1, fontSize: '0.875rem' }}
              onBlur={e => e.target.value && updateAdvance(e.target.value)}
            />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
          <button className="btn btn-tertiary" style={{ flex: 1 }} onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" style={{ flex: 2 }} onClick={handleSave} disabled={saving}>
            {saving ? <div className="spinner spinner--sm" /> : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
