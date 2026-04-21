// src/pages/student/Dashboard.jsx
import { useState, useEffect } from 'react';
import { supabase } from '../../supabase';
import { useAuth } from '../../context/AuthContext';
import { useStudent } from '../../context/StudentContext';
import TopBar from '../../components/shared/TopBar';
import BottomNav from '../../components/shared/BottomNav';
import PausedBanner from '../../components/shared/PausedBanner';
import SiblingSwitch from '../../components/shared/SiblingSwitch';
import PushPrompt from '../../components/shared/PushPrompt';
import { usePushPermission } from '../../hooks/usePWA';
import { format, isToday, isPast } from 'date-fns';

export default function StudentDashboard() {
  const { signOut } = useAuth();
  const { activeStudent, isPaused, linkedStudents } = useStudent();
  const [showSwitch, setShowSwitch] = useState(false);
  const [todayData, setTodayData] = useState(null);
  const [loading, setLoading] = useState(true);

  const { permission, supported } = usePushPermission();
  const [showPushPrompt, setShowPushPrompt] = useState(false);

  useEffect(() => {
    if (supported && permission === 'default') {
      const t = setTimeout(() => setShowPushPrompt(true), 1500);
      return () => clearTimeout(t);
    }
  }, [supported, permission]);

  useEffect(() => {
    if (!activeStudent) return;
    loadTodayData();
  }, [activeStudent?.id]);

  async function loadTodayData() {
    setLoading(true);
    const today = format(new Date(), 'yyyy-MM-dd');
    const [attRes, feesRes, noticesRes] = await Promise.all([
      supabase.from('attendance').select('status, remark').eq('student_id', activeStudent.id).eq('date', today).single(),
      supabase.from('fees').select('amount, due_date, status').eq('student_id', activeStudent.id).neq('status', 'Paid').neq('status', 'Waived').order('due_date').limit(3),
      supabase.from('notices').select('id, title, content, created_at').order('created_at', { ascending: false }).limit(3),
    ]);
    setTodayData({
      attendance: attRes.data,
      pendingFees: feesRes.data || [],
      notices: noticesRes.data || [],
    });
    setLoading(false);
  }

  const overdueCount = todayData?.pendingFees?.filter(f => isPast(new Date(f.due_date))).length || 0;

  return (
    <div className="page-wrapper">
      <TopBar
        actions={
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
            {linkedStudents.length > 1 && (
              <button className="top-bar__icon-btn" onClick={() => setShowSwitch(true)} title="Switch account">
                <span className="material-symbols-outlined">switch_account</span>
              </button>
            )}
            <button className="top-bar__icon-btn" onClick={signOut} title="Sign out">
              <span className="material-symbols-outlined">logout</span>
            </button>
          </div>
        }
      />

      <main className="container" style={{ paddingTop: 'var(--space-lg)' }}>

        {isPaused && <PausedBanner reason={activeStudent?.pause_reason} />}

        {/* Overdue alert */}
        {overdueCount > 0 && (
          <div style={{
            background: 'var(--tertiary-container)', color: 'var(--on-tertiary-container)',
            padding: 'var(--space-md)', borderRadius: 'var(--radius-lg)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            marginBottom: 'var(--space-md)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
              <span className="material-symbols-outlined icon-filled">error</span>
              <span className="title-sm">
                {overdueCount} overdue fee{overdueCount > 1 ? 's' : ''} — ₹
                {todayData?.pendingFees?.filter(f => isPast(new Date(f.due_date))).reduce((s, f) => s + f.amount, 0).toLocaleString('en-IN')}
              </span>
            </div>
            <span className="material-symbols-outlined">chevron_right</span>
          </div>
        )}

        {/* Greeting hero */}
        <div className="hero-card animate-fade-up" style={{ marginBottom: 'var(--space-md)', minHeight: 'auto', padding: 'var(--space-lg)' }}>
          <div className="hero-card__eyebrow">Today, {format(new Date(), 'EEEE d MMM')}</div>
          <div className="hero-card__title">
            Hi, {activeStudent?.full_name?.split(' ')[0] || 'Student'}!
          </div>
          <div style={{ display: 'flex', gap: 'var(--space-xl)', marginTop: 'var(--space-md)' }}>
            <div>
              <div className="hero-stat__number" style={{ fontSize: '2rem' }}>
                {loading ? '—' : (todayData?.attendance?.status || 'Not marked')}
              </div>
              <div className="hero-stat__label">Today's Status</div>
            </div>
            {/* <div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 2 }}>
                <span className="hero-stat__currency">₹</span>
                <span className="hero-stat__number" style={{ fontSize: '2rem' }}>
                  {activeStudent?.advance_balance?.toLocaleString('en-IN') || 0}
                </span>
              </div>
              <div className="hero-stat__label">Advance Deposit</div>
            </div> */}
          </div>
          <span className="material-symbols-outlined hero-card__bg-icon">school</span>
        </div>

        {/* Bento Grid: Attendance + Advance */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)', marginBottom: 'var(--space-lg)' }}>
          <div className="card ghost-border">
            <div className="label-sm text-surface-variant">Attendance</div>
            <div style={{ marginTop: 'var(--space-sm)' }}>
              {loading ? (
                <div className="skeleton" style={{ height: 24, width: '70%' }} />
              ) : todayData?.attendance ? (
                <span className={`chip chip-${todayData.attendance.status.toLowerCase().replace(' ', '-')}`}>
                  {todayData.attendance.status}
                </span>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <div className="pulse-dot" style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--primary)' }} />
                  <span className="title-sm text-primary">Pending</span>
                </div>
              )}
            </div>
            <div className="label-sm text-surface-variant" style={{ marginTop: 4 }}>
              {todayData?.attendance?.remark || 'Class today'}
            </div>
          </div>

          <div className="card ghost-border">
            <div className="label-sm text-surface-variant">Pending Fees</div>
            <div className="headline-sm text-primary" style={{ marginTop: 'var(--space-sm)' }}>
              {loading ? <div className="skeleton" style={{ height: 28, width: 60 }} /> : todayData?.pendingFees?.length || 0}
            </div>
            <div className="label-sm text-surface-variant" style={{ marginTop: 4 }}>
              {overdueCount > 0 ? `${overdueCount} overdue` : 'All clear'}
            </div>
          </div>
        </div>

        {/* Pending Fee Highlight */}
        {!loading && todayData?.pendingFees?.length > 0 && (
          <>
            <div className="section-header"><span className="section-title">Due Fees</span></div>
            <div className="card-list" style={{ marginBottom: 'var(--space-lg)' }}>
              {todayData.pendingFees.map(fee => {
                const isOverdue = isPast(new Date(fee.due_date));
                return (
                  <div key={fee.due_date} className="card-item" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      {isOverdue && <span className="chip chip-overdue" style={{ marginBottom: 4, display: 'block' }}>Overdue</span>}
                      <div className="title-sm">Monthly Tuition Fee</div>
                      <div className="label-sm text-surface-variant">Due: {format(new Date(fee.due_date), 'dd MMM yyyy')}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 2 }}>
                        <span className="label-sm text-surface-variant">₹</span>
                        <span className="headline-sm text-primary">{fee.amount?.toLocaleString('en-IN')}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* Recent Notices */}
        {!loading && todayData?.notices?.length > 0 && (
          <>
            <div className="section-header"><span className="section-title">Recent Notices</span></div>
            <div className="card-list">
              {todayData.notices.map(notice => (
                <div key={notice.id} className="card-item">
                  <div style={{ display: 'flex', gap: 'var(--space-sm)', alignItems: 'flex-start' }}>
                    <span className="material-symbols-outlined icon-filled" style={{ color: 'var(--primary)', fontSize: '1.125rem', flexShrink: 0 }}>campaign</span>
                    <div>
                      <div className="title-sm">{notice.title}</div>
                      <div className="body-sm text-surface-variant" style={{ WebkitLineClamp: 2, overflow: 'hidden', display: '-webkit-box', WebkitBoxOrient: 'vertical' }}>
                        {notice.content}
                      </div>
                      <div className="label-sm text-surface-variant" style={{ marginTop: 4 }}>
                        {format(new Date(notice.created_at), 'dd MMM')}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        <div style={{ height: 'var(--space-md)' }} />
      </main>

      <BottomNav role="student" />

      {showSwitch && <SiblingSwitch onClose={() => setShowSwitch(false)} />}

      {showPushPrompt && (
        <PushPrompt onDismiss={() => setShowPushPrompt(false)} />
      )}
    </div>
  );
}
