// src/context/AuthContext.jsx
// Manages Supabase session, user role, and teacher/student profile

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase, toInternalEmail } from '../supabase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // Fetch profile from DB (includes role)
  const fetchProfile = useCallback(async (userId) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    if (!error) setProfile(data);
  }, []);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) fetchProfile(session.user.id);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        if (session?.user) {
          await fetchProfile(session.user.id);
        } else {
          setProfile(null);
        }
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, [fetchProfile]);

  // Teacher registration (email + password)
  const registerTeacher = async ({ email, password, fullName }) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { role: 'teacher', full_name: fullName },
      },
    });
    return { data, error };
  };

  // Teacher login
  const loginTeacher = async ({ email, password }) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    return { data, error };
  };

  // Student login (username → fake email)
  const loginStudent = async ({ username, password }) => {
    const email = toInternalEmail(username);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    return { data, error };
  };

  // Create student account (called by teacher)
  const createStudentAccount = async ({ username, password, fullName, teacherId }) => {
    const email = toInternalEmail(username);

    // Use Edge Function to create user with service role
    const { data, error } = await supabase.functions.invoke('create-student-user', {
      body: { email, password, username, fullName, teacherId },
    });
    return { data, error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setSession(null);
  };

  const refreshProfile = () => {
    if (session?.user) fetchProfile(session.user.id);
  };

  const value = {
    session,
    user: session?.user ?? null,
    profile,
    isTeacher: profile?.role === 'teacher',
    isStudent: profile?.role === 'student',
    loading,
    registerTeacher,
    loginTeacher,
    loginStudent,
    createStudentAccount,
    signOut,
    refreshProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
