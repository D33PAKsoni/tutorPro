// src/hooks/useTeacher.js
// Centralised data hook for teacher-scoped operations.
// Returns loading state, data arrays, and CRUD helpers.

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabase';
import { useAuth } from '../context/AuthContext';

/**
 * useTeacher()
 * Provides teacher dashboard stats and student list with full CRUD.
 *
 * Usage:
 *   const { students, stats, loading, addStudent, updateStudent, deleteStudent, togglePause } = useTeacher();
 */
export function useTeacher() {
  const { user } = useAuth();
  const [students, setStudents] = useState([]);
  const [stats, setStats] = useState({ activeStudents: 0, pendingFees: 0, todayAttendance: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchStudents = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from('students')
        .select('*')
        .eq('teacher_id', user.id)
        .order('full_name');
      if (err) throw err;
      setStudents(data || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const fetchStats = useCallback(async () => {
    if (!user) return;
    try {
      const today = new Date().toISOString().split('T')[0];
      const [studRes, feesRes, attRes] = await Promise.all([
        supabase
          .from('students')
          .select('id', { count: 'exact', head: true })
          .eq('teacher_id', user.id)
          .eq('is_paused', false),
        supabase
          .from('fees')
          .select('amount, paid_amount, status')
          .eq('teacher_id', user.id)
          .neq('status', 'Paid')
          .neq('status', 'Waived'),
        supabase
          .from('attendance')
          .select('id', { count: 'exact', head: true })
          .eq('teacher_id', user.id)
          .eq('date', today),
      ]);

      const pendingFees = (feesRes.data || []).reduce(
        (sum, f) => sum + (f.amount - (f.paid_amount || 0)), 0
      );

      setStats({
        activeStudents: studRes.count || 0,
        pendingFees,
        todayAttendance: attRes.count || 0,
      });
    } catch (e) {
      console.error('Stats fetch error:', e);
    }
  }, [user]);

  useEffect(() => {
    fetchStudents();
    fetchStats();
  }, [fetchStudents, fetchStats]);

  // ---- CRUD helpers ----

  const addStudent = useCallback(async (studentData) => {
    if (!user) return { error: 'Not authenticated' };
    const { data, error: err } = await supabase
      .from('students')
      .insert({ ...studentData, teacher_id: user.id })
      .select()
      .single();
    if (!err) {
      setStudents(prev => [...prev, data].sort((a, b) => a.full_name.localeCompare(b.full_name)));
    }
    return { data, error: err };
  }, [user]);

  const updateStudent = useCallback(async (id, updates) => {
    const { data, error: err } = await supabase
      .from('students')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (!err) {
      setStudents(prev => prev.map(s => s.id === id ? { ...s, ...data } : s));
    }
    return { data, error: err };
  }, []);

  const deleteStudent = useCallback(async (id) => {
    const { error: err } = await supabase.from('students').delete().eq('id', id);
    if (!err) {
      setStudents(prev => prev.filter(s => s.id !== id));
    }
    return { error: err };
  }, []);

  const togglePause = useCallback(async (student) => {
    return updateStudent(student.id, {
      is_paused: !student.is_paused,
      pause_reason: student.is_paused ? null : student.pause_reason,
    });
  }, [updateStudent]);

  const updateAdvanceBalance = useCallback(async (studentId, newBalance) => {
    return updateStudent(studentId, { advance_balance: parseFloat(newBalance) || 0 });
  }, [updateStudent]);

  return {
    students,
    stats,
    loading,
    error,
    refresh: () => { fetchStudents(); fetchStats(); },
    addStudent,
    updateStudent,
    deleteStudent,
    togglePause,
    updateAdvanceBalance,
    // Computed subsets
    activeStudents: students.filter(s => !s.is_paused),
    pausedStudents: students.filter(s => s.is_paused),
  };
}
