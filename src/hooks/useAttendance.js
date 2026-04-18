// src/hooks/useAttendance.js
// Attendance data hook for teacher — loads students + existing records for a given date

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabase';
import { useAuth } from '../context/AuthContext';

const STATUSES = ['Present', 'Absent', 'Holiday', 'Extra Class'];

/**
 * Load active students and their attendance status for `selectedDate`.
 * Returns helpers to update and save the attendance map.
 */
export function useAttendance(selectedDate) {
  const { user } = useAuth();
  const [students, setStudents] = useState([]);
  const [attendance, setAttendance] = useState({}); // { studentId: status }
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState(null);

  const load = useCallback(async () => {
    if (!user || !selectedDate) return;
    setLoading(true);

    const [studsRes, existingRes] = await Promise.all([
      supabase
        .from('students')
        .select('id, full_name, student_id, grade')
        .eq('teacher_id', user.id)
        .eq('is_paused', false)
        .order('full_name'),
      supabase
        .from('attendance')
        .select('student_id, status, remark')
        .eq('teacher_id', user.id)
        .eq('date', selectedDate),
    ]);

    const attMap = {};
    (existingRes.data || []).forEach(a => { attMap[a.student_id] = a.status; });

    setStudents(studsRes.data || []);
    setAttendance(attMap);
    setLoading(false);
  }, [user, selectedDate]);

  useEffect(() => { load(); }, [load]);

  function setStatus(studentId, status) {
    setAttendance(prev => ({ ...prev, [studentId]: status }));
  }

  async function save() {
    if (!user || students.length === 0) return;
    setSaving(true);
    const rows = students.map(s => ({
      teacher_id: user.id,
      student_id: s.id,
      date: selectedDate,
      status: attendance[s.id] || 'Present',
    }));

    const { error } = await supabase
      .from('attendance')
      .upsert(rows, { onConflict: 'teacher_id,student_id,date' });

    if (!error) setSavedAt(new Date());
    setSaving(false);
    return !error;
  }

  // Derived summary counts
  const summary = STATUSES.reduce((acc, s) => {
    acc[s] = Object.values(attendance).filter(v => v === s).length;
    return acc;
  }, {});

  return {
    students,
    attendance,
    setStatus,
    save,
    loading,
    saving,
    savedAt,
    summary,
    STATUSES,
  };
}
