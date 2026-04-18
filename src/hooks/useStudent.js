// src/hooks/useStudent.js
// Data hook for a student's own records (attendance, fees, assessments, notices).
// Reads from StudentContext for the active student ID.

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabase';
import { useStudent as useStudentContext } from '../context/StudentContext';
import { format, startOfMonth, subMonths } from 'date-fns';

/**
 * useStudentData()
 * Returns all records for the currently active student.
 *
 * Usage:
 *   const { attendance, fees, assessments, notices, loading } = useStudentData();
 */
export function useStudentData() {
  const { activeStudentId, activeStudent } = useStudentContext();
  const [attendance, setAttendance] = useState([]);
  const [fees, setFees] = useState([]);
  const [assessments, setAssessments] = useState([]);
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchAll = useCallback(async () => {
    if (!activeStudentId) { setLoading(false); return; }
    setLoading(true);
    setError(null);
    try {
      // Last 3 months of attendance
      const threeMonthsAgo = format(subMonths(new Date(), 3), 'yyyy-MM-dd');
      const today = format(new Date(), 'yyyy-MM-dd');

      const [attRes, feesRes, assessRes, noticeRes] = await Promise.all([
        supabase
          .from('attendance')
          .select('*')
          .eq('student_id', activeStudentId)
          .gte('date', threeMonthsAgo)
          .lte('date', today)
          .order('date', { ascending: false }),
        supabase
          .from('fees')
          .select('*')
          .eq('student_id', activeStudentId)
          .order('due_date', { ascending: false }),
        supabase
          .from('assessments')
          .select('*')
          .eq('student_id', activeStudentId)
          .order('assessment_date', { ascending: false }),
        supabase
          .from('notices')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(50),
      ]);

      if (attRes.error) throw attRes.error;
      setAttendance(attRes.data || []);
      setFees(feesRes.data || []);
      setAssessments(assessRes.data || []);
      setNotices(noticeRes.data || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [activeStudentId]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ---- Computed values ----
  const today = format(new Date(), 'yyyy-MM-dd');
  const todayAttendance = attendance.find(a => a.date === today) || null;
  const pendingFees = fees.filter(f => f.status !== 'Paid' && f.status !== 'Waived');
  const overdueFees = pendingFees.filter(f => new Date(f.due_date) < new Date());
  const currentMonthFees = fees.filter(
    f => f.month === format(startOfMonth(new Date()), 'yyyy-MM-dd')
  );

  return {
    student: activeStudent,
    attendance,
    fees,
    assessments,
    notices,
    loading,
    error,
    refresh: fetchAll,
    // Computed
    todayAttendance,
    pendingFees,
    overdueFees,
    currentMonthFees,
    isPaused: activeStudent?.is_paused ?? false,
    advanceBalance: activeStudent?.advance_balance ?? 0,
  };
}
