// src/hooks/useTeacher.js
// Reusable data hooks for teacher-scoped queries

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabase';
import { useAuth } from '../context/AuthContext';
import { format, startOfMonth } from 'date-fns';

/**
 * Fetch all students belonging to the logged-in teacher.
 * Optionally filter out paused students with { activeOnly: true }.
 */
export function useStudents({ activeOnly = false } = {}) {
  const { user } = useAuth();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetch = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    let q = supabase
      .from('students')
      .select('*')
      .eq('teacher_id', user.id)
      .order('full_name');
    if (activeOnly) q = q.eq('is_paused', false);
    const { data, error: err } = await q;
    if (err) setError(err.message);
    else setStudents(data || []);
    setLoading(false);
  }, [user, activeOnly]);

  useEffect(() => { fetch(); }, [fetch]);

  return { students, loading, error, refetch: fetch };
}

/**
 * Fetch teacher dashboard stats: active students, pending fees, today's attendance count.
 */
export function useTeacherStats() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const today = format(new Date(), 'yyyy-MM-dd');

    const [studentsRes, feesRes, attendanceRes] = await Promise.all([
      supabase
        .from('students')
        .select('id', { count: 'exact' })
        .eq('teacher_id', user.id)
        .eq('is_paused', false),
      supabase
        .from('fees')
        .select('amount, paid_amount, status')
        .eq('teacher_id', user.id),
      supabase
        .from('attendance')
        .select('id', { count: 'exact' })
        .eq('teacher_id', user.id)
        .eq('date', today),
    ]);

    const pendingFees = (feesRes.data || [])
      .filter(f => f.status !== 'Paid' && f.status !== 'Waived')
      .reduce((sum, f) => sum + (f.amount - (f.paid_amount || 0)), 0);

    setStats({
      activeStudents: studentsRes.count || 0,
      pendingFees,
      todayAttendance: attendanceRes.count || 0,
    });
    setLoading(false);
  }, [user]);

  useEffect(() => { fetch(); }, [fetch]);

  return { stats, loading, refetch: fetch };
}

/**
 * Fetch fees for a given month.
 * Returns fees joined with student info.
 */
export function useTeacherFees(month) {
  const { user } = useAuth();
  const [fees, setFees] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!user || !month) return;
    setLoading(true);
    const monthStr = format(startOfMonth(month), 'yyyy-MM-dd');
    const { data } = await supabase
      .from('fees')
      .select('*, students(full_name, student_id, advance_balance, is_paused)')
      .eq('teacher_id', user.id)
      .eq('month', monthStr)
      .order('due_date');
    setFees(data || []);
    setLoading(false);
  }, [user, month]);

  useEffect(() => { fetch(); }, [fetch]);

  return { fees, loading, refetch: fetch };
}

/**
 * Fetch assessments for the teacher, joined with student names.
 */
export function useTeacherAssessments() {
  const { user } = useAuth();
  const [assessments, setAssessments] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from('assessments')
      .select('*, students(full_name, student_id)')
      .eq('teacher_id', user.id)
      .order('assessment_date', { ascending: false });
    setAssessments(data || []);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetch(); }, [fetch]);

  return { assessments, loading, refetch: fetch };
}

/**
 * Fetch notices created by the teacher.
 */
export function useTeacherNotices() {
  const { user } = useAuth();
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from('notices')
      .select('*')
      .eq('teacher_id', user.id)
      .order('created_at', { ascending: false });
    setNotices(data || []);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetch(); }, [fetch]);

  return { notices, loading, refetch: fetch };
}
