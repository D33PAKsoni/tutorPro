// src/pages/teacher/Fees.jsx
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../supabase';
import { useAuth } from '../../context/AuthContext';
import TopBar from '../../components/shared/TopBar';
import BottomNav from '../../components/shared/BottomNav';
import { format, parseISO, startOfMonth, endOfMonth, subMonths, addMonths } from 'date-fns';

function getInitials(name = '') {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

export default function TeacherFees() {
  const { user } = useAuth();
  const [month, setMonth] = useState(startOfMonth(new Date()));
  const [fees, setFees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [editFee, setEditFee] = useState(null);

  const loadFees = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const monthStr = format(month, 'yyyy-MM-dd');
    const { data } = await supabase
      .from('fees')
      .select('*, students(full_name, student_id, advance_balance, is_paused)')
      .eq('teacher_id', user.id)
      .eq('month', monthStr)
      .order('due_date');
    setFees(data || []);
    setLoading(false);
  }, [user, month]);

  useEffect(() => { loadFees(); }, [loadFees]);

  async function togglePaid(fee) {
    const newStatus = fee.status === 'Paid' ? 'Pending' : 'Paid';
    await supabase
      .from('fees')
      .update({
        status: newStatus,
        paid_amount: newStatus === 'Paid' ? fee.amount : 0,
        paid_date: newStatus === 'Paid' ? format(new Date(), 'yyyy-MM-dd') : null,
      })
      .eq('id', fee.id);
    loadFees();
  }

  async function generateFees() {
    setGenerating(true);
    // Fetch active students
    const { data: students } = await supabase
      .from('students')
      .select('id, monthly_fee, fee_due_day')
      .eq('teacher_id', user.id)
      .eq('is_paused', false);

    const monthStr = format(month, 'yyyy-MM-dd');
    const rows = (students || [])
      .filter(s => s.monthly_fee > 0)
      .map(s => {
        const dueDay = s.fee_due_day || 5;
        const due = format(new Date(month.getFullYear(), month.getMonth(), dueDay), 'yyyy-MM-dd');
        return { teacher_id: user.id, student_id: s.id, month: monthStr, amount: s.monthly_fee, due_date: due };
      });

    await supabase.from('fees').upsert(rows, { onConflict: 'teacher_id,student_id,month' });
    setGenerating(false);
    loadFees();
  }

  const totalAmount = fees.reduce((s, f) => s + f.amount, 0);
  const totalPaid = fees.filter(f => f.status === 'Paid').reduce((s, f) => s + f.amount, 0);
  const pendingCount = fees.filter(f => f.status !== 'Paid' && f.status !== 'Waived').length;
  const overdueCount = fees.filter(f => f.status === 'Pending' && new Date(f.due_date) < new Date()).length;

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
                {totalPaid.toLocaleString('en-IN')}
              </span>
            </div>
            <div className="label-sm" style={{ opacity: 0.8, color: 'var(--on-primary-container)' }}>
              of ₹{totalAmount.toLocaleString('en-IN')}
            </div>
          </div>
          <div className="card" style={{ background: 'var(--tertiary-fixed)' }}>
            <div className="label-sm text-surface-variant">Pending / Overdue</div>
            <div className="headline-sm" style={{ color: 'var(--on-tertiary-fixed-variant)', marginTop: 4 }}>
              {pendingCount} <span style={{ fontSize: '1rem' }}>pending</span>
            </div>
            {overdueCount > 0 && (
              <div className="label-sm" style={{ color: 'var(--tertiary)', marginTop: 2 }}>
                {overdueCount} overdue
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
                  <div className="student-avatar" style={{ opacity: fee.students?.is_paused ? 0.5 : 1 }}>
                    {getInitials(fee.students?.full_name || '')}
                  </div>
                  <div style={{ flex: 1, cursor: 'pointer' }} onClick={() => setEditFee(fee)}>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <span className="title-sm">{fee.students?.full_name}</span>
                      {isOverdue && <span className="chip chip-overdue">Overdue</span>}
                    </div>
                    <div style={{ display: 'flex', gap: '0.75rem', marginTop: 2 }}>
                      <span style={{ color: 'var(--on-surface-variant)', fontSize: '0.875rem' }}>
                        <span style={{ color: 'var(--on-surface-variant)', fontWeight: 400 }}>₹</span>
                        <span className="title-sm">{fee.amount?.toLocaleString('en-IN')}</span>
                      </span>
                      <span className="label-sm text-surface-variant">Due {format(parseISO(fee.due_date), 'dd MMM')}</span>
                    </div>
                    {fee.students?.advance_balance > 0 && (
                      <div className="label-sm" style={{ color: 'var(--secondary)', marginTop: 2 }}>
                        Advance: ₹{fee.students.advance_balance.toLocaleString('en-IN')}
                      </div>
                    )}
                  </div>

                  {/* Paid toggle */}
                  <label className="toggle-switch" style={{ cursor: 'pointer' }} title={fee.status === 'Paid' ? 'Mark unpaid' : 'Mark paid'}>
                    <input
                      type="checkbox"
                      checked={fee.status === 'Paid'}
                      onChange={() => togglePaid(fee)}
                      style={{ display: 'none' }}
                    />
                    <div className="toggle-track">
                      <div className="toggle-thumb" />
                    </div>
                  </label>
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
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  async function handleDelete() {
    setDeleting(true);
    await supabase.from('fees').delete().eq('id', fee.id);
    setDeleting(false);
    onSaved();
  }

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

        {!confirmDelete ? (
          <button
            onClick={() => setConfirmDelete(true)}
            style={{
              width: '100%', padding: '0.6rem', marginTop: 'var(--space-xs)',
              background: 'none', border: '1px solid var(--error)',
              borderRadius: 'var(--radius-md)', color: 'var(--error)',
              fontFamily: 'var(--font-body)', fontSize: '0.875rem', fontWeight: 600,
              cursor: 'pointer', display: 'flex', alignItems: 'center',
              justifyContent: 'center', gap: '0.4rem',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>delete</span>
            Delete this fee record
          </button>
        ) : (
          <div style={{
            border: '1px solid var(--error)', borderRadius: 'var(--radius-md)',
            padding: 'var(--space-md)', marginTop: 'var(--space-xs)',
          }}>
            <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--error)', marginBottom: 'var(--space-sm)' }}>
              Delete fee for {fee.students?.full_name}? This cannot be undone.
            </div>
            <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
              <button className="btn btn-tertiary" style={{ flex: 1 }} onClick={() => setConfirmDelete(false)}>
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                style={{
                  flex: 1, padding: '0.6rem',
                  background: 'var(--error)', border: 'none',
                  borderRadius: 'var(--radius-md)', color: '#fff',
                  fontFamily: 'var(--font-body)', fontSize: '0.875rem', fontWeight: 600,
                  cursor: 'pointer', display: 'flex', alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {deleting ? <div className="spinner spinner--sm" style={{ borderTopColor: '#fff' }} /> : 'Yes, Delete'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
