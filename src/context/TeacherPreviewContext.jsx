// src/context/TeacherPreviewContext.jsx
// Lets a teacher "preview" any of their students' dashboards without re-logging in.
// Overrides StudentContext values so all existing student pages render the
// previewed student's data transparently — zero changes needed to student pages.

import { createContext, useContext, useState, useCallback } from 'react';

const TeacherPreviewContext = createContext(null);

export function TeacherPreviewProvider({ children }) {
  const [previewStudent, setPreviewStudent] = useState(null); // full student row or null

  const startPreview = useCallback((student) => {
    setPreviewStudent(student);
  }, []);

  const stopPreview = useCallback(() => {
    setPreviewStudent(null);
  }, []);

  return (
    <TeacherPreviewContext.Provider value={{ previewStudent, startPreview, stopPreview, isPreview: !!previewStudent }}>
      {children}
    </TeacherPreviewContext.Provider>
  );
}

export function useTeacherPreview() {
  const ctx = useContext(TeacherPreviewContext);
  if (!ctx) throw new Error('useTeacherPreview must be inside TeacherPreviewProvider');
  return ctx;
}
