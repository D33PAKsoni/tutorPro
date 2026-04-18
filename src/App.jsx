// src/App.jsx

import { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { StudentProvider } from './context/StudentContext';
import './styles/global.css';
import './styles/components.css';
import './styles/layout.css';

const Login           = lazy(() => import('./pages/auth/Login'));
const Register        = lazy(() => import('./pages/auth/Register'));
const GoogleCallback  = lazy(() => import('./pages/auth/GoogleCallback'));

const TeacherDashboard   = lazy(() => import('./pages/teacher/Dashboard'));
const TeacherStudents    = lazy(() => import('./pages/teacher/Students'));
const TeacherAttendance  = lazy(() => import('./pages/teacher/Attendance'));
const TeacherFees        = lazy(() => import('./pages/teacher/Fees'));
const TeacherAssessments = lazy(() => import('./pages/teacher/Assessments'));
const TeacherNotices     = lazy(() => import('./pages/teacher/Notices'));
const TeacherSettings    = lazy(() => import('./pages/teacher/Settings'));

const StudentDashboard   = lazy(() => import('./pages/student/Dashboard'));
const StudentAttendance  = lazy(() => import('./pages/student/Attendance'));
const StudentFees        = lazy(() => import('./pages/student/Fees'));
const StudentAssessments = lazy(() => import('./pages/student/Assessments'));
const StudentNotices     = lazy(() => import('./pages/student/Notices'));

function FullLoader() {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      minHeight: '100dvh', background: 'var(--background)',
    }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
        <span className="material-symbols-outlined" style={{ fontSize: '2.5rem', color: 'var(--primary)' }}>school</span>
        <div className="spinner spinner--lg" />
      </div>
    </div>
  );
}

// ── RequireAuth ────────────────────────────────────────────────────────────
// Only shows the loader while AuthContext is initialising (loading=true).
// Once loading=false:
//   • no session         → /login
//   • session, no profile → /login with error state (trigger not set up)
//   • wrong role         → correct home
//   • all good           → render children
function RequireAuth({ children, role }) {
  const { session, profile, loading } = useAuth();

  if (loading) return <FullLoader />;
  if (!session) return <Navigate to="/login" replace />;
  if (!profile) return <Navigate to="/login" replace state={{ error: 'profile_missing' }} />;
  if (role && profile.role !== role) {
    return <Navigate to={profile.role === 'teacher' ? '/teacher' : '/student'} replace />;
  }
  return children;
}

// ── PublicRoute ────────────────────────────────────────────────────────────
// Redirects logged-in users away from /login and /register.
// If session exists but profile not yet loaded, still show the page —
// the redirect will happen once profile arrives via onAuthStateChange.
function PublicRoute({ children }) {
  const { session, profile, loading } = useAuth();

  if (loading) return <FullLoader />;
  // Only redirect if we have BOTH session and profile so we know where to send them
  if (session && profile) {
    return <Navigate to={profile.role === 'teacher' ? '/teacher' : '/student'} replace />;
  }
  return children;
}

function StudentRoute({ children }) {
  return (
    <RequireAuth role="student">
      <StudentProvider>{children}</StudentProvider>
    </RequireAuth>
  );
}

function RootRedirect() {
  const { session, profile, loading } = useAuth();
  if (loading) return <FullLoader />;
  if (!session) return <Navigate to="/login" replace />;
  if (!profile) return <Navigate to="/login" replace state={{ error: 'profile_missing' }} />;
  return <Navigate to={profile.role === 'teacher' ? '/teacher' : '/student'} replace />;
}

function AppRouter() {
  return (
    <BrowserRouter>
      <Suspense fallback={<FullLoader />}>
        <Routes>
          <Route path="/" element={<RootRedirect />} />

          <Route path="/login"    element={<PublicRoute><Login /></PublicRoute>} />
          <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
          <Route path="/auth/google/callback" element={<GoogleCallback />} />

          <Route path="/teacher"             element={<RequireAuth role="teacher"><TeacherDashboard /></RequireAuth>} />
          <Route path="/teacher/students"    element={<RequireAuth role="teacher"><TeacherStudents /></RequireAuth>} />
          <Route path="/teacher/attendance"  element={<RequireAuth role="teacher"><TeacherAttendance /></RequireAuth>} />
          <Route path="/teacher/fees"        element={<RequireAuth role="teacher"><TeacherFees /></RequireAuth>} />
          <Route path="/teacher/assessments" element={<RequireAuth role="teacher"><TeacherAssessments /></RequireAuth>} />
          <Route path="/teacher/notices"     element={<RequireAuth role="teacher"><TeacherNotices /></RequireAuth>} />
          <Route path="/teacher/settings"    element={<RequireAuth role="teacher"><TeacherSettings /></RequireAuth>} />

          <Route path="/student"             element={<StudentRoute><StudentDashboard /></StudentRoute>} />
          <Route path="/student/attendance"  element={<StudentRoute><StudentAttendance /></StudentRoute>} />
          <Route path="/student/fees"        element={<StudentRoute><StudentFees /></StudentRoute>} />
          <Route path="/student/assessments" element={<StudentRoute><StudentAssessments /></StudentRoute>} />
          <Route path="/student/notices"     element={<StudentRoute><StudentNotices /></StudentRoute>} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppRouter />
    </AuthProvider>
  );
}
