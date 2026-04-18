// src/App.jsx
// Root: Auth + Student providers, React Router, role-based layout

import { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { StudentProvider } from './context/StudentContext';
import './styles/global.css';
import './styles/components.css';
import './styles/layout.css';
import LoadingSpinner from './components/shared/LoadingSpinner';

// ---- Lazy-loaded pages ----
// Auth
const Login    = lazy(() => import('./pages/auth/Login'));
const Register = lazy(() => import('./pages/auth/Register'));
const GoogleCallback = lazy(() => import('./pages/auth/GoogleCallback'));

// Teacher
const TeacherDashboard   = lazy(() => import('./pages/teacher/Dashboard'));
const TeacherStudents    = lazy(() => import('./pages/teacher/Students'));
const TeacherAttendance  = lazy(() => import('./pages/teacher/Attendance'));
const TeacherFees        = lazy(() => import('./pages/teacher/Fees'));
const TeacherAssessments = lazy(() => import('./pages/teacher/Assessments'));
const TeacherNotices     = lazy(() => import('./pages/teacher/Notices'));
const TeacherSettings    = lazy(() => import('./pages/teacher/Settings'));

// Student
const StudentDashboard   = lazy(() => import('./pages/student/Dashboard'));
const StudentAttendance  = lazy(() => import('./pages/student/Attendance'));
const StudentFees        = lazy(() => import('./pages/student/Fees'));
const StudentAssessments = lazy(() => import('./pages/student/Assessments'));
const StudentNotices     = lazy(() => import('./pages/student/Notices'));

// ---- Full-screen loading ----
function FullLoader() {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100dvh',
      background: 'var(--background)',
    }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
        <span className="material-symbols-outlined" style={{ fontSize: '2.5rem', color: 'var(--primary)' }}>school</span>
        <div className="spinner spinner--lg" />
      </div>
    </div>
  );
}

// ---- Auth Guard: redirects unauthenticated users ----
function RequireAuth({ children, role }) {
  const { session, profile, loading } = useAuth();

  if (loading) return <FullLoader />;

  // No session → go to login
  if (!session) return <Navigate to="/login" replace />;

  // Session exists but profile still null after loading finished →
  // means the profiles trigger didn't fire (DB misconfiguration).
  // Redirect to a helpful error page rather than spinning forever.
  if (!profile) return <Navigate to="/login" replace state={{ error: 'profile_missing' }} />;

  // Wrong role → redirect to correct home
  if (role && profile.role !== role) {
    return <Navigate to={profile.role === 'teacher' ? '/teacher' : '/student'} replace />;
  }

  return children;
}

// ---- Public Guard: redirects authenticated users away from login ----
function PublicRoute({ children }) {
  const { session, profile, loading } = useAuth();
  if (loading) return <FullLoader />;
  if (session && profile) {
    return <Navigate to={profile.role === 'teacher' ? '/teacher' : '/student'} replace />;
  }
  return children;
}

// ---- Student wrapper (provides StudentContext on every student route) ----
function StudentRoute({ children }) {
  return (
    <RequireAuth role="student">
      <StudentProvider>
        {children}
      </StudentProvider>
    </RequireAuth>
  );
}

// ---- Main Router ----
function AppRouter() {
  return (
    <BrowserRouter>
      <Suspense fallback={<FullLoader />}>
        <Routes>
          {/* Root redirect */}
          <Route path="/" element={<RootRedirect />} />

          {/* Auth */}
          <Route path="/login"    element={<PublicRoute><Login /></PublicRoute>} />
          <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
          <Route path="/auth/google/callback" element={<GoogleCallback />} />

          {/* Teacher Routes */}
          <Route path="/teacher"             element={<RequireAuth role="teacher"><TeacherDashboard /></RequireAuth>} />
          <Route path="/teacher/students"    element={<RequireAuth role="teacher"><TeacherStudents /></RequireAuth>} />
          <Route path="/teacher/attendance"  element={<RequireAuth role="teacher"><TeacherAttendance /></RequireAuth>} />
          <Route path="/teacher/fees"        element={<RequireAuth role="teacher"><TeacherFees /></RequireAuth>} />
          <Route path="/teacher/assessments" element={<RequireAuth role="teacher"><TeacherAssessments /></RequireAuth>} />
          <Route path="/teacher/notices"     element={<RequireAuth role="teacher"><TeacherNotices /></RequireAuth>} />
          <Route path="/teacher/settings"    element={<RequireAuth role="teacher"><TeacherSettings /></RequireAuth>} />

          {/* Student Routes */}
          <Route path="/student"             element={<StudentRoute><StudentDashboard /></StudentRoute>} />
          <Route path="/student/attendance"  element={<StudentRoute><StudentAttendance /></StudentRoute>} />
          <Route path="/student/fees"        element={<StudentRoute><StudentFees /></StudentRoute>} />
          <Route path="/student/assessments" element={<StudentRoute><StudentAssessments /></StudentRoute>} />
          <Route path="/student/notices"     element={<StudentRoute><StudentNotices /></StudentRoute>} />

          {/* 404 */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

function RootRedirect() {
  const { session, profile, loading } = useAuth();
  if (loading) return <FullLoader />;
  if (!session) return <Navigate to="/login" replace />;
  return <Navigate to={profile?.role === 'teacher' ? '/teacher' : '/student'} replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <AppRouter />
    </AuthProvider>
  );
}
