// src/context/StudentContext.jsx
// Manages the "active student" for sibling switching
// A single login can be associated with multiple student profiles via trust_records

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '../supabase';
import { useAuth } from './AuthContext';

const StudentContext = createContext(null);

export function StudentProvider({ children }) {
  const { user, isStudent } = useAuth();
  const [linkedStudents, setLinkedStudents] = useState([]);
  const [activeStudentId, setActiveStudentId] = useState(null);
  const [activeStudent, setActiveStudent] = useState(null);
  const [loading, setLoading] = useState(true);

  // Fetch all student profiles this user has access to
  const fetchLinkedStudents = useCallback(async () => {
    if (!user || !isStudent) {
      setLoading(false);
      return;
    }

    try {
      // 1. Students where auth_user_id matches directly
      const { data: ownRecord } = await supabase
        .from('students')
        .select('*')
        .eq('auth_user_id', user.id);

      // 2. Students linked via trust_records (siblings)
      const { data: trustRecords } = await supabase
        .from('trust_records')
        .select('student_id')
        .eq('auth_profile_id', user.id);

      const trustedIds = (trustRecords || []).map(r => r.student_id);

      let trustedStudents = [];
      if (trustedIds.length > 0) {
        const { data } = await supabase
          .from('students')
          .select('*')
          .in('id', trustedIds);
        trustedStudents = data || [];
      }

      // Merge and deduplicate
      const all = [...(ownRecord || []), ...trustedStudents];
      const unique = Array.from(new Map(all.map(s => [s.id, s])).values());
      setLinkedStudents(unique);

      // Set active to first (or previously selected)
      const saved = sessionStorage.getItem(`active-student-${user.id}`);
      const initial = saved && unique.find(s => s.id === saved) ? saved : unique[0]?.id;
      if (initial) {
        setActiveStudentId(initial);
        setActiveStudent(unique.find(s => s.id === initial) || null);
      }
    } finally {
      setLoading(false);
    }
  }, [user, isStudent]);

  useEffect(() => {
    fetchLinkedStudents();
  }, [fetchLinkedStudents]);

  // Switch to a different sibling account (no re-auth needed)
  const switchToStudent = useCallback((studentId) => {
    const target = linkedStudents.find(s => s.id === studentId);
    if (!target) return;

    setActiveStudentId(studentId);
    setActiveStudent(target);
    // Persist selection within the session
    if (user) sessionStorage.setItem(`active-student-${user.id}`, studentId);
  }, [linkedStudents, user]);

  // Refresh active student record
  const refreshActiveStudent = useCallback(async () => {
    if (!activeStudentId) return;
    const { data } = await supabase
      .from('students')
      .select('*')
      .eq('id', activeStudentId)
      .single();
    if (data) {
      setActiveStudent(data);
      setLinkedStudents(prev => prev.map(s => s.id === data.id ? data : s));
    }
  }, [activeStudentId]);

  return (
    <StudentContext.Provider value={{
      linkedStudents,
      activeStudentId,
      activeStudent,
      loading,
      switchToStudent,
      refreshLinked: fetchLinkedStudents,
      refreshActiveStudent,
      isPaused: activeStudent?.is_paused ?? false,
    }}>
      {children}
    </StudentContext.Provider>
  );
}

export function useStudent() {
  const ctx = useContext(StudentContext);
  if (!ctx) throw new Error('useStudent must be used inside StudentProvider');
  return ctx;
}
