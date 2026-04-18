// src/hooks/useStudent.js
// Reusable data hooks for student-scoped queries (read-only)

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabase';
import { useStudent as useStudentContext } from '../context/StudentContext';
import { format, startOfMonth } from 'date-fns';

/**
 * Fetch today's attendance, pending fees, and recent notices for the active student.
 * Used on the student dashboard.
 */
export function useStudentToday() {
  const { activeStudent } = useStudentContext();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!activeStudent) return;
    setLoading(true);
    const today = format(new Date(), 'yyyy-MM-dd');

    const [attRes, feesRes, noticesRes] = await Promise.all([
      supabase
        .from('attendance')
        .select('status, remark')
        .eq('student_id', activeStudent.id)
        .eq('date', today)
        .maybeSingle(),
      supabase
        .from('fees')
        .select('amount, due_date, status')
        .eq('student_id', activeStudent.id)
        .neq('status', 'Paid')
        .neq('status', 'Waived')
        .order('due_date')
        .limit(3),
      supabase
        .from('notices')
        .select('id, title, content, created_at')
        .order('created_at', { ascending: false })
        .limit(3),
    ]);

    setData({
      attendance: attRes.data,
      pendingFees: feesRes.data || [],
      notices: noticesRes.data || [],
    });
    setLoading(false);
  }, [activeStudent?.id]);

  useEffect(() => { fetch(); }, [fetch]);

  return { today: data, loading, refetch: fetch };
}

/**
 * Fetch attendance records for the active student within a given month.
 */
export function useStudentAttendance(month) {
  const { activeStudent } = useStudentContext();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!activeStudent || !month) return;
    setLoading(true);
    const year = month.getFullYear();
    const mon = month.getMonth();
    const from = format(new Date(year, mon, 1), 'yyyy-MM-dd');
    const to = format(new Date(year, mon + 1, 0), 'yyyy-MM-dd');

    const { data } = await supabase
      .from('attendance')
      .select('*')
      .eq('student_id', activeStudent.id)
      .gte('date', from)
      .lte('date', to)
      .order('date', { ascending: false });

    setRecords(data || []);
    setLoading(false);
  }, [activeStudent?.id, month]);

  useEffect(() => { fetch(); }, [fetch]);

  return { records, loading, refetch: fetch };
}

/**
 * Fetch fee records for the active student for a given month.
 * Does NOT include payment ledger (privacy requirement).
 */
export function useStudentFees(month) {
  const { activeStudent } = useStudentContext();
  const [fees, setFees] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!activeStudent || !month) return;
    setLoading(true);
    const monthStr = format(startOfMonth(month), 'yyyy-MM-dd');

    const { data } = await supabase
      .from('fees')
      .select('id, amount, due_date, status, month, remark')
      .eq('student_id', activeStudent.id)
      .eq('month', monthStr);

    setFees(data || []);
    setLoading(false);
  }, [activeStudent?.id, month]);

  useEffect(() => { fetch(); }, [fetch]);

  return { fees, loading, refetch: fetch };
}

/**
 * Fetch assessments for the active student.
 */
export function useStudentAssessments() {
  const { activeStudent } = useStudentContext();
  const [assessments, setAssessments] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!activeStudent) return;
    setLoading(true);
    const { data } = await supabase
      .from('assessments')
      .select('*')
      .eq('student_id', activeStudent.id)
      .order('assessment_date', { ascending: false });
    setAssessments(data || []);
    setLoading(false);
  }, [activeStudent?.id]);

  useEffect(() => { fetch(); }, [fetch]);

  return { assessments, loading, refetch: fetch };
}

/**
 * Fetch notices visible to the active student.
 */
export function useStudentNotices() {
  const { activeStudent } = useStudentContext();
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!activeStudent) return;
    setLoading(true);
    const { data } = await supabase
      .from('notices')
      .select('*')
      .order('is_pinned', { ascending: false })
      .order('created_at', { ascending: false });
    setNotices(data || []);
    setLoading(false);
  }, [activeStudent?.id]);

  useEffect(() => { fetch(); }, [fetch]);

  return { notices, loading, refetch: fetch };
}
