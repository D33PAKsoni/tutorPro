// src/hooks/useFees.js
// Fees data hook — handles monthly fee loading, generation, status toggle,
// and individual fee editing for teachers. Read-only view for students.

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabase';
import { useAuth } from '../context/AuthContext';
import { format, startOfMonth, isPast, parseISO } from 'date-fns';

/**
 * useTeacherFees(month)
 * Full CRUD fees management for the teacher for a given month.
 *
 * Usage:
 *   const { fees, loading, generating, togglePaid, updateFee, generateFees, summary } = useTeacherFees(selectedMonth);
 */
export function useTeacherFees(month) {
  const { user } = useAuth();
  const [fees, setFees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(null);

  const monthStr = format(month || startOfMonth(new Date()), 'yyyy-MM-dd');

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from('fees')
        .select('*, students(full_name, student_id, advance_balance, is_paused, grade)')
        .eq('teacher_id', user.id)
        .eq('month', monthStr)
        .order('due_date');
      if (err) throw err;
      setFees(data || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [user, monthStr]);

  useEffect(() => { load(); }, [load]);

  /** Toggle a fee between Paid and Pending */
  const togglePaid = useCallback(async (fee) => {
    const newStatus = fee.status === 'Paid' ? 'Pending' : 'Paid';
    const { error: err } = await supabase
      .from('fees')
      .update({
        status: newStatus,
        paid_amount: newStatus === 'Paid' ? fee.amount : 0,
        paid_date: newStatus === 'Paid' ? format(new Date(), 'yyyy-MM-dd') : null,
      })
      .eq('id', fee.id);
    if (!err) {
      setFees(prev => prev.map(f =>
        f.id === fee.id
          ? { ...f, status: newStatus, paid_amount: newStatus === 'Paid' ? fee.amount : 0 }
          : f
      ));
    }
    return { error: err };
  }, []);

  /** Update fee details (amount, due_date, status, remark, paid_amount) */
  const updateFee = useCallback(async (id, updates) => {
    const { data, error: err } = await supabase
      .from('fees')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (!err) {
      setFees(prev => prev.map(f => f.id === id ? { ...f, ...data } : f));
    }
    return { data, error: err };
  }, []);

  /**
   * Generate monthly fees for all active (non-paused) students.
   * Uses UPSERT so running it twice doesn't create duplicates.
   */
  const generateFees = useCallback(async () => {
    if (!user) return;
    setGenerating(true);
    try {
      const { data: students } = await supabase
        .from('students')
        .select('id, monthly_fee, fee_due_day')
        .eq('teacher_id', user.id)
        .eq('is_paused', false)
        .gt('monthly_fee', 0);

      const monthDate = parseISO(monthStr);
      const rows = (students || []).map(s => {
        const dueDay = Math.min(s.fee_due_day || 5, 28);
        const dueDate = format(
          new Date(monthDate.getFullYear(), monthDate.getMonth(), dueDay),
          'yyyy-MM-dd'
        );
        return {
          teacher_id: user.id,
          student_id: s.id,
          month: monthStr,
          amount: s.monthly_fee,
          due_date: dueDate,
          status: 'Pending',
        };
      });

      if (rows.length > 0) {
        await supabase.from('fees').upsert(rows, { onConflict: 'teacher_id,student_id,month' });
      }
      await load();
    } finally {
      setGenerating(false);
    }
  }, [user, monthStr, load]);

  // ---- Summary stats ----
  const summary = {
    total: fees.reduce((s, f) => s + f.amount, 0),
    collected: fees.filter(f => f.status === 'Paid').reduce((s, f) => s + f.amount, 0),
    pending: fees.filter(f => f.status === 'Pending').length,
    overdue: fees.filter(f => f.status === 'Pending' && isPast(new Date(f.due_date))).length,
    waived: fees.filter(f => f.status === 'Waived').length,
  };

  return { fees, loading, generating, error, summary, togglePaid, updateFee, generateFees, refresh: load };
}

/**
 * useStudentFees(studentId, month)
 * Read-only fee view for students.
 * Does NOT expose paid_date or any ledger/history details.
 */
export function useStudentFees(studentId, month) {
  const [fees, setFees] = useState([]);
  const [loading, setLoading] = useState(true);

  const monthStr = format(month || startOfMonth(new Date()), 'yyyy-MM-dd');

  useEffect(() => {
    if (!studentId) return;
    setLoading(true);
    supabase
      .from('fees')
      // Intentionally NOT selecting paid_date or paid_amount — student privacy
      .select('id, amount, due_date, status, month, remark')
      .eq('student_id', studentId)
      .eq('month', monthStr)
      .then(({ data }) => {
        setFees(data || []);
        setLoading(false);
      });
  }, [studentId, monthStr]);

  const overdueFees = fees.filter(f => f.status === 'Pending' && isPast(new Date(f.due_date)));
  const pendingFees = fees.filter(f => f.status !== 'Paid' && f.status !== 'Waived');

  return { fees, loading, overdueFees, pendingFees };
}
