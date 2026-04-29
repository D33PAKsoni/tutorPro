// src/components/shared/TeacherPreviewOverlay.jsx
// Full-screen overlay that renders student pages while teacher is in preview mode.
// Teacher stays authenticated — this is purely a UI/data overlay, not a session switch.

import { useState, lazy, Suspense } from 'react';
import { useTeacherPreview } from '../../context/TeacherPreviewContext';
import { PreviewBridgeContext } from '../../context/StudentContext';

// Lazy-load all student pages so the bundle isn't affected when not previewing
const StudentDashboard   = lazy(() => import('../../pages/student/Dashboard'));
const StudentAttendance  = lazy(() => import('../../pages/student/Attendance'));
const StudentFees        = lazy(() => import('../../pages/student/Fees'));
const StudentAssessments = lazy(() => import('../../pages/student/Assessments'));
const StudentNotices     = lazy(() => import('../../pages/student/Notices'));

const TABS = [
  { id: 'dashboard',   label: 'Today',      icon: 'today',      component: StudentDashboard   },
  { id: 'attendance',  label: 'Attendance', icon: 'checklist',  component: StudentAttendance  },
  { id: 'fees',        label: 'Fees',       icon: 'payments',   component: StudentFees        },
  { id: 'assessments', label: 'Tests',      icon: 'assignment', component: StudentAssessments },
  { id: 'notices',     label: 'Notices',    icon: 'campaign',   component: StudentNotices     },
];

export default function TeacherPreviewOverlay() {
  const { previewStudent, stopPreview } = useTeacherPreview();
  const [activeTab, setActiveTab] = useState('dashboard');

  if (!previewStudent) return null;

  const ActivePage = TABS.find(t => t.id === activeTab)?.component ?? StudentDashboard;

  // Inject previewStudent into the bridge context so useStudent() returns it
  const bridgeValue = { previewStudent };

  function getInitials(name = '') {
    return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  }

  return (
    // Full-screen overlay on top of everything
    <div style={{
      position: 'fixed', inset: 0, zIndex: 500,
      background: 'var(--bg, #0a0d12)',
      display: 'flex', flexDirection: 'column',
      overflowY: 'auto',
    }}>
      {/* ── Preview banner ─────────────────────────────────────────────── */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 10,
        background: 'linear-gradient(90deg, #7c3aed 0%, #6366f1 100%)',
        padding: '0.625rem 1rem',
        display: 'flex', alignItems: 'center', gap: '0.75rem',
        boxShadow: '0 2px 12px rgba(99,102,241,0.4)',
      }}>
        {/* Avatar */}
        <div style={{
          width: 32, height: 32, borderRadius: '50%',
          background: 'rgba(255,255,255,0.2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'var(--font-display)', fontWeight: 800,
          fontSize: '0.8125rem', color: '#fff', flexShrink: 0,
        }}>
          {getInitials(previewStudent.full_name)}
        </div>

        {/* Label */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: '0.8125rem', fontWeight: 700, color: '#fff',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>
            Previewing: {previewStudent.full_name}
          </div>
          <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.7)' }}>
            {previewStudent.student_id} · Read-only view
          </div>
        </div>

        {/* Exit preview */}
        <button
          onClick={stopPreview}
          style={{
            background: 'rgba(255,255,255,0.15)',
            border: '1px solid rgba(255,255,255,0.25)',
            borderRadius: 'var(--radius-md, 8px)',
            color: '#fff', cursor: 'pointer',
            padding: '0.375rem 0.75rem',
            fontFamily: 'var(--font-body)', fontSize: '0.8125rem', fontWeight: 600,
            display: 'flex', alignItems: 'center', gap: '0.25rem',
            flexShrink: 0,
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>arrow_back</span>
          Exit Preview
        </button>
      </div>

      {/* ── Student page content ────────────────────────────────────────── */}
      {/* Inject bridge context so useStudent() returns previewStudent */}
      <PreviewBridgeContext.Provider value={bridgeValue}>
        <Suspense fallback={
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, padding: '3rem' }}>
            <div className="spinner" />
          </div>
        }>
          <div style={{ flex: 1 }}>
            <ActivePage />
          </div>
        </Suspense>
      </PreviewBridgeContext.Provider>

      {/* ── Tab bar ────────────────────────────────────────────────────── */}
      <nav style={{
        position: 'sticky', bottom: 0,
        background: 'var(--surface, #11151c)',
        borderTop: '1px solid var(--outline-variant, #1e2535)',
        display: 'flex',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}>
        {TABS.map(tab => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                flex: 1, padding: '0.5rem 0.25rem 0.625rem',
                background: 'none', border: 'none', cursor: 'pointer',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.125rem',
                color: isActive ? 'var(--primary, #6366f1)' : 'var(--on-surface-variant, #64748b)',
                transition: 'color 0.15s',
              }}
            >
              <span
                className="material-symbols-outlined"
                style={{
                  fontSize: '1.375rem',
                  fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0",
                }}
              >
                {tab.icon}
              </span>
              <span style={{ fontSize: '0.625rem', fontWeight: 600, letterSpacing: '0.02em' }}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
