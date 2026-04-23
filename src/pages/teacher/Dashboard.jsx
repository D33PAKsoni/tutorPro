// src/pages/teacher/Dashboard.jsx
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../supabase';
import { useAuth } from '../../context/AuthContext';
import TopBar from '../../components/shared/TopBar';
import BottomNav from '../../components/shared/BottomNav';
import PushPrompt from '../../components/shared/PushPrompt';
import { usePushPermission } from '../../hooks/usePWA';
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
  const [stats, setStats] = useState(null);
  const [recentActivity, setRecentActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNoticeModal, setShowNoticeModal] = useState(false);

  // Push notification prompt — shown once per session if not yet granted
  const { permission, supported } = usePushPermission();
  const [showPushPrompt, setShowPushPrompt] = useState(false);

  useEffect(() => {
    // Show prompt after a short delay so dashboard loads first
    if (supported && permission === 'default') {
      const t = setTimeout(() => setShowPushPrompt(true), 1500);
      return () => clearTimeout(t);
    }
  }, [supported, permission]);

  useEffect(() => {
    if (!user) return;
    loadStats();
  }, [user]);

  async function loadStats() {
    setLoading(true);
    try {
      const today = format(new Date(), 'yyyy-MM-dd');

      const [studentsRes, feesRes, attendanceRes] = await Promise.all([
        supabase.from('students').select('id', { count: 'exact' }).eq('teacher_id', user.id).eq('is_paused', false),
        supabase.from('fees').select('amount, paid_amount, status').eq('teacher_id', user.id),
        supabase.from('attendance').select('id', { count: 'exact' }).eq('teacher_id', user.id).eq('date', today),
      ]);

      const activeStudents = studentsRes.count || 0;

      // Calculate pending fees total
      const pendingFees = (feesRes.data || [])
        .filter(f => f.status !== 'Paid' && f.status !== 'Waived')
        .reduce((sum, f) => sum + (f.amount - (f.paid_amount || 0)), 0);

      const todayAttendance = attendanceRes.count || 0;

      setStats({ activeStudents, pendingFees, todayAttendance });

      // Recent activity: last 5 fee payments + last 5 attendance marks
      const [recentFees, recentAttendance] = await Promise.all([
        supabase.from('fees')
          .select('*, students(full_name)')
          .eq('teacher_id', user.id)
          .eq('status', 'Paid')
          .order('updated_at', { ascending: false })
          .limit(3),
        supabase.from('attendance')
          .select('*, students(full_name)')
          .eq('teacher_id', user.id)
          .order('created_at', { ascending: false })
          .limit(3),
      ]);

      const activity = [
        ...(recentFees.data || []).map(f => ({
          type: 'fee',
          title: `Fee Collected: ${f.students?.full_name}`,
          sub: `₹${f.amount?.toLocaleString('en-IN')}`,
          icon: 'payments',
          bg: 'var(--primary-fixed)',
          iconColor: 'var(--primary)',
          time: f.updated_at,
        })),
        ...(recentAttendance.data || []).map(a => ({
          type: 'attendance',
          title: `Attendance: ${a.students?.full_name}`,
          sub: a.status,
          icon: 'person_check',
          bg: 'var(--secondary-container)',
          iconColor: 'var(--secondary)',
          time: a.created_at,
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
            <Link to="/teacher/settings" className="top-bar__icon-btn" title="Settings" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none', color: 'inherit' }}>
              <span className="material-symbols-outlined">settings</span>
            </Link>
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
            {loading ? <StatSkeleton /> : (
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
        <QuickNoticeModal teacherId={user.id} onClose={() => setShowNoticeModal(false)} />
      )}

      {/* Push notification prompt — shown once per session */}
      {showPushPrompt && (
        <PushPrompt onDismiss={() => setShowPushPrompt(false)} />
      )}
    </div>
  );
}

function QuickNoticeModal({ teacherId, onClose }) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [sending, setSending] = useState(false);

  async function handleSend() {
    if (!title.trim() || !content.trim()) return;
    setSending(true);
    await supabase.from('notices').insert({
      teacher_id: teacherId,
      title: title.trim(),
      content: content.trim(),
      recipient_type: 'all',
    });
    setSending(false);
    onClose();
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" onClick={e => e.stopPropagation()}>
        <div className="modal-handle" />
        <div className="modal-title">New Notice</div>

        <div className="field">
          <label className="field__label">Title</label>
          <input
            className="field__input"
            placeholder="e.g. Class rescheduled to Monday"
            value={title}
            onChange={e => setTitle(e.target.value)}
          />
        </div>

        <div className="field">
          <label className="field__label">Content</label>
          <textarea
            className="field__input"
            placeholder="Write notice content here..."
            value={content}
            onChange={e => setContent(e.target.value)}
            rows={4}
            style={{ resize: 'vertical' }}
          />
        </div>

        <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
          <button className="btn btn-tertiary" style={{ flex: 1 }} onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleSend} disabled={sending}>
            {sending ? <div className="spinner spinner--sm" /> : 'Broadcast'}
          </button>
        </div>
      </div>
    </div>
  );
}
