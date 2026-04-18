// src/hooks/useFees.js
// Fee management hooks — generate, toggle paid, and edit fee records

import { useState, useCallback } from 'react';
import { supabase } from '../supabase';
import { useAuth } from '../context/AuthContext';
import { format, startOfMonth } from 'date-fns';

/**
 * Generate fee records for all active students in `month`.
 * Skips students with is_paused = true and those with monthly_fee = 0.
 * Uses upsert so running it twice is safe.
 */
export function useFeeGenerator() {
  const { user } = useAuth();
  const [generating, setGenerating] = useState(false);

  const generate = useCallback(async (month) => {
    if (!user) return;
    setGenerating(true);

    const { data: students } = await supabase
      .from('students')
      .select('id, monthly_fee, fee_due_day')
      .eq('teacher_id', user.id)
      .eq('is_paused', false);

    const monthStr = format(startOfMonth(month), 'yyyy-MM-dd');

    const rows = (students || [])
      .filter(s => (s.monthly_fee || 0) > 0)
      .map(s => {
        const dueDay = s.fee_due_day || 5;
        const due = format(
          new Date(month.getFullYear(), month.getMonth(), dueDay),
          'yyyy-MM-dd'
        );
        return {
          teacher_id: user.id,
          student_id: s.id,
          month: monthStr,
          amount: s.monthly_fee,
          due_date: due,
          status: 'Pending',
        };
      });

    const { error } = await supabase
      .from('fees')
      .upsert(rows, { onConflict: 'teacher_id,student_id,month' });

    setGenerating(false);
    return !error;
  }, [user]);

  return { generate, generating };
}

/**
 * Toggle a single fee's paid/pending status.
 * Returns a mutate function and loading state.
 */
export function useFeeToggle(onSuccess) {
  const [toggling, setToggling] = useState(null); // stores fee.id being toggled

  const toggle = useCallback(async (fee) => {
    setToggling(fee.id);
    const newStatus = fee.status === 'Paid' ? 'Pending' : 'Paid';
    await supabase
      .from('fees')
      .update({
        status: newStatus,
        paid_amount: newStatus === 'Paid' ? fee.amount : 0,
        paid_date: newStatus === 'Paid' ? format(new Date(), 'yyyy-MM-dd') : null,
      })
      .eq('id', fee.id);
    setToggling(null);
    onSuccess?.();
  }, [onSuccess]);

  return { toggle, toggling };
}

/**
 * Save detailed edits to a fee record (amount, due date, status, remarks).
 */
export function useFeeEdit(onSuccess) {
  const [saving, setSaving] = useState(false);

  const save = useCallback(async (feeId, form) => {
    setSaving(true);
    const { error } = await supabase
      .from('fees')
      .update({
        amount: parseFloat(form.amount),
        due_date: form.due_date,
        status: form.status,
        paid_amount: parseFloat(form.paid_amount) || 0,
        paid_date: form.status === 'Paid' ? format(new Date(), 'yyyy-MM-dd') : null,
        remark: form.remark,
      })
      .eq('id', feeId);
    setSaving(false);
    if (!error) onSuccess?.();
    return !error;
  }, [onSuccess]);

  return { save, saving };
}
