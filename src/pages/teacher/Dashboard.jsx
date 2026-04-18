// src/pages/teacher/Dashboard.jsx
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../supabase';
import { useAuth } from '../../context/AuthContext';
import { useTeacher } from '../../hooks/useTeacher';
import TopBar from '../../components/shared/TopBar';
import BottomNav from '../../components/shared/BottomNav';
import NoticeComposer from '../../components/teacher/NoticeComposer';
import { initiateGoogleOAuth } from '../../lib/googleDrive';
import { format } from 'date-fns';

function StatSkeleton() {
  return (
    <div style={{ display: 'flex', gap: '3rem', marginTop: '1rem' }}>
      {[1, 2].map(i => (
        <div key={i}>
          <div className="skeleton" style={{ width: 80, height: 56, marginBottom: 4 }} />
          <div className="skeleton" style={{ width: 100, height: 14 }} />
        </div>
      ))}
    </div>
  );
}

export default function TeacherDashboard() {
  const { user, profile, signOut } = useAuth();
  const { stats, loading: statsLoading } = useTeacher();
  const [recentActivity, setRecentActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNoticeModal, setShowNoticeModal] = useState(false);
  const [students, setStudents] = useState([]);

  useEffect(() => {
    if (!user) return;
    loadActivity();
    // Fetch students list for NoticeComposer
    supabase.from('students').select('id, full_name').eq('teacher_id', user.id).eq('is_paused', false)
      .then(({ data }) => setStudents(data || []));
  }, [user]);

  async function loadActivity() {
    setLoading(true);
    try {
      const [recentFees, recentAttendance] = await Promise.all([
        supabase.from('fees').select('*, students(full_name)').eq('teacher_id', user.id).eq('status', 'Paid').order('updated_at', { ascending: false }).limit(3),
        supabase.from('attendance').select('*, students(full_name)').eq('teacher_id', user.id).order('created_at', { ascending: false }).limit(3),
      ]);

      const activity = [
        ...(recentFees.data || []).map(f => ({
          type: 'fee', title: `Fee Collected: ${f.students?.full_name}`,
          sub: `₹${f.amount?.toLocaleString('en-IN')}`, icon: 'payments',
          bg: 'var(--primary-fixed)', iconColor: 'var(--primary)', time: f.updated_at,
        })),
        ...(recentAttendance.data || []).map(a => ({
          type: 'attendance', title: `Attendance: ${a.students?.full_name}`,
          sub: a.status, icon: 'person_check',
          bg: 'var(--secondary-container)', iconColor: 'var(--secondary)', time: a.created_at,
        })),
      ].sort((a, b) => new Date(b.time) - new Date(a.time)).slice(0, 5);

      setRecentActivity(activity);
    } finally {
      setLoading(false);
    }
  }

  const teacherName = profile?.full_name || user?.email?.split('@')[0] || 'Teacher';

  return (
    <div className="page-wrapper">
      <TopBar
        actions={
          <>
            <button
              className="top-bar__action-btn"
              onClick={initiateGoogleOAuth}
              title="Link Google Drive for backups"
            >
              <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>add_to_drive</span>
              Drive
            </button>
            <button className="top-bar__icon-btn" onClick={signOut} title="Sign out">
              <span className="material-symbols-outlined">logout</span>
            </button>
          </>
        }
      />

      <main className="container" style={{ paddingTop: 'var(--space-lg)' }}>

        {/* Hero Bento Card */}
        <div className="hero-card animate-fade-up" style={{ marginBottom: 'var(--space-md)' }}>
          <div>
            <div className="hero-card__eyebrow">Current Overview</div>
            <div className="hero-card__title">Welcome back, {teacherName.split(' ')[0]}</div>
          </div>
          <div>
            {statsLoading ? <StatSkeleton /> : (
              <div className="hero-card__stat-group">
                <div className="hero-stat">
                  <span className="hero-stat__number">{stats?.activeStudents ?? 0}</span>
                  <span className="hero-stat__label">Active Students</span>
                </div>
                <div className="hero-stat">
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 2 }}>
                    <span className="hero-stat__currency">₹</span>
                    <span className="hero-stat__number">
                      {(stats?.pendingFees ?? 0).toLocaleString('en-IN')}
                    </span>
                  </div>
                  <span className="hero-stat__label">Pending Fees</span>
                </div>
              </div>
            )}
          </div>
          <span className="material-symbols-outlined hero-card__bg-icon">monitoring</span>
        </div>

        {/* Quick Actions Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)', marginBottom: 'var(--space-lg)' }}>
          <Link to="/teacher/attendance" style={{ textDecoration: 'none' }}>
            <div className="card ghost-border" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'flex-start' }}>
              <div style={{ width: 40, height: 40, borderRadius: 'var(--radius-full)', background: 'var(--secondary-container)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span className="material-symbols-outlined" style={{ color: 'var(--secondary)' }}>checklist</span>
              </div>
              <div className="title-sm text-primary">Mark Attendance</div>
              <div className="body-sm text-surface-variant">
                {loading ? '—' : `${stats?.todayAttendance} marked today`}
              </div>
            </div>
          </Link>

          <button
            className="card ghost-border"
            style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'flex-start', cursor: 'pointer', border: 'none', width: '100%', textAlign: 'left' }}
            onClick={() => setShowNoticeModal(true)}
          >
            <div style={{ width: 40, height: 40, borderRadius: 'var(--radius-full)', background: 'var(--primary-fixed)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span className="material-symbols-outlined" style={{ color: 'var(--primary)' }}>campaign</span>
            </div>
            <div className="title-sm text-primary">Send Notice</div>
            <div className="body-sm text-surface-variant">Broadcast to students</div>
          </button>

          <Link to="/teacher/fees" style={{ textDecoration: 'none' }}>
            <div className="card ghost-border" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'flex-start' }}>
              <div style={{ width: 40, height: 40, borderRadius: 'var(--radius-full)', background: 'var(--tertiary-fixed)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span className="material-symbols-outlined" style={{ color: 'var(--on-tertiary-fixed-variant)' }}>payments</span>
              </div>
              <div className="title-sm text-primary">Manage Fees</div>
              <div className="body-sm text-surface-variant">Update payment status</div>
            </div>
          </Link>

          <Link to="/teacher/students" style={{ textDecoration: 'none' }}>
            <div className="card ghost-border" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'flex-start' }}>
              <div style={{ width: 40, height: 40, borderRadius: 'var(--radius-full)', background: 'var(--secondary-container)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span className="material-symbols-outlined" style={{ color: 'var(--secondary)' }}>group_add</span>
              </div>
              <div className="title-sm text-primary">Students</div>
              <div className="body-sm text-surface-variant">Add or manage students</div>
            </div>
          </Link>
        </div>

        {/* Recent Activity */}
        <div className="section-header">
          <span className="section-title">Recent Activity</span>
          <Link to="/teacher/fees" className="section-action">View All</Link>
        </div>

        {loading ? (
          <div className="card-list">
            {[1,2,3].map(i => (
              <div key={i} className="card-item" style={{ display: 'flex', gap: '1rem' }}>
                <div className="skeleton" style={{ width: 40, height: 40, borderRadius: 'var(--radius-lg)', flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div className="skeleton" style={{ width: '60%', height: 14, marginBottom: 6 }} />
                  <div className="skeleton" style={{ width: '40%', height: 12 }} />
                </div>
              </div>
            ))}
          </div>
        ) : recentActivity.length === 0 ? (
          <div className="empty-state">
            <span className="material-symbols-outlined empty-state__icon">history</span>
            <div className="empty-state__title">No activity yet</div>
            <div className="empty-state__body">Start by adding students and marking attendance</div>
          </div>
        ) : (
          <div className="card-list">
            {recentActivity.map((item, idx) => (
              <div key={idx} className="card-item" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 'var(--radius-lg)',
                  background: item.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                }}>
                  <span className="material-symbols-outlined" style={{ color: item.iconColor, fontSize: '1.25rem' }}>
                    {item.icon}
                  </span>
                </div>
                <div style={{ flex: 1 }}>
                  <div className="title-sm">{item.title}</div>
                  <div className="label-sm text-surface-variant">{item.sub}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div style={{ height: 'var(--space-md)' }} />
      </main>

      <BottomNav role="teacher" />

      {/* Quick Notice Modal */}
      {showNoticeModal && (
        <NoticeComposer
          teacherId={user.id}
          students={students}
          onClose={() => setShowNoticeModal(false)}
          onSaved={() => { setShowNoticeModal(false); loadActivity(); }}
        />
      )}
    </div>
  );
}
