// src/hooks/useAttendance.js
// Teacher-scoped attendance operations.
// Loads active (non-paused) students + existing records for a selected date,
// and exposes bulk upsert to save the whole day at once.

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabase';
import { useAuth } from '../context/AuthContext';
import { format } from 'date-fns';

export const ATTENDANCE_STATUSES = ['Present', 'Absent', 'Holiday', 'Extra Class'];

/**
 * useAttendance(date?)
 * @param {string} [initialDate] - yyyy-MM-dd (defaults to today)
 *
 * Usage:
 *   const {
 *     date, setDate,
 *     students, statusMap, setStatus,
 *     loading, saving, savedAt,
 *     saveAll, stats
 *   } = useAttendance();
 */
export function useAttendance(initialDate) {
  const { user } = useAuth();
  const [date, setDate] = useState(initialDate || format(new Date(), 'yyyy-MM-dd'));
  const [students, setStudents] = useState([]);
  // statusMap: { [studentId]: 'Present' | 'Absent' | 'Holiday' | 'Extra Class' }
  const [statusMap, setStatusMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState(null);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    if (!user || !date) return;
    setLoading(true);
    setError(null);
    try {
      // Only non-paused students appear in attendance view
      const { data: studs, error: sErr } = await supabase
        .from('students')
        .select('id, full_name, student_id, grade, subjects')
        .eq('teacher_id', user.id)
        .eq('is_paused', false)
        .order('full_name');
      if (sErr) throw sErr;

      // Fetch existing records for this date
      const { data: existing, error: aErr } = await supabase
        .from('attendance')
        .select('student_id, status, remark')
        .eq('teacher_id', user.id)
        .eq('date', date);
      if (aErr) throw aErr;

      const map = {};
      (existing || []).forEach(r => { map[r.student_id] = r.status; });

      setStudents(studs || []);
      setStatusMap(map);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [user, date]);

  useEffect(() => { load(); }, [load]);

  const setStatus = useCallback((studentId, status) => {
    setStatusMap(prev => ({ ...prev, [studentId]: status }));
  }, []);

  /** Bulk upsert all student statuses for the selected date */
  const saveAll = useCallback(async () => {
    if (!user || students.length === 0) return { error: 'Nothing to save' };
    setSaving(true);
    setError(null);
    try {
      const rows = students.map(s => ({
        teacher_id: user.id,
        student_id: s.id,
        date,
        status: statusMap[s.id] || 'Present',
      }));

      const { error: err } = await supabase
        .from('attendance')
        .upsert(rows, { onConflict: 'teacher_id,student_id,date' });

      if (err) throw err;
      setSavedAt(new Date());
      return { error: null };
    } catch (e) {
      setError(e.message);
      return { error: e.message };
    } finally {
      setSaving(false);
    }
  }, [user, students, date, statusMap]);

  /** Mark all active students with the same status */
  const markAll = useCallback((status) => {
    const map = {};
    students.forEach(s => { map[s.id] = status; });
    setStatusMap(map);
  }, [students]);

  // ---- Derived stats ----
  const stats = {
    total: students.length,
    present: Object.values(statusMap).filter(s => s === 'Present').length,
    absent: Object.values(statusMap).filter(s => s === 'Absent').length,
    holiday: Object.values(statusMap).filter(s => s === 'Holiday').length,
    extra: Object.values(statusMap).filter(s => s === 'Extra Class').length,
    marked: Object.keys(statusMap).length,
  };

  return {
    date,
    setDate,
    students,
    statusMap,
    setStatus,
    markAll,
    loading,
    saving,
    savedAt,
    error,
    saveAll,
    stats,
    refresh: load,
  };
}

/**
 * useAttendanceHistory(studentId, month)
 * For student view — loads one month of records.
 */
export function useAttendanceHistory(studentId, month) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!studentId || !month) return;
    setLoading(true);
    const from = format(month, 'yyyy-MM-01');
    const to = format(new Date(month.getFullYear(), month.getMonth() + 1, 0), 'yyyy-MM-dd');
    const { data } = await supabase
      .from('attendance')
      .select('*')
      .eq('student_id', studentId)
      .gte('date', from)
      .lte('date', to)
      .order('date', { ascending: false });
    setRecords(data || []);
    setLoading(false);
  }, [studentId, month]);

  useEffect(() => { load(); }, [load]);

  const presentCount = records.filter(r => r.status === 'Present').length;
  const attendancePct = records.length > 0
    ? Math.round((presentCount / records.length) * 100) : 0;

  return { records, loading, presentCount, attendancePct, refresh: load };
}
