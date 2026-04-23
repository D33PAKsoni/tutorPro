// src/pages/student/Settings.jsx
import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useStudent } from '../../context/StudentContext';
import TopBar from '../../components/shared/TopBar';
import BottomNav from '../../components/shared/BottomNav';
import SiblingSwitch from '../../components/shared/SiblingSwitch';
import { usePWAInstall, usePushPermission } from '../../hooks/usePWA';

export default function StudentSettings() {
  const { user, signOut } = useAuth();
  const { activeStudent, linkedStudents } = useStudent();
  const [showSwitch, setShowSwitch] = useState(false);

  const { canInstall, isInstalled, install } = usePWAInstall();
  const {
    permission: pushPermission,
    supported: pushSupported,
    subscribing: pushSubscribing,
    error: pushError,
    vapidKey,
    requestPermission,
    requestUnsubscribe,
  } = usePushPermission();

  function getInitials(name = '') {
    return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  }

  return (
    <div className="page-wrapper">
      <TopBar title="Settings" backTo="/student" />

      <main className="container" style={{ paddingTop: 'var(--space-lg)' }}>

        {/* Profile card */}
        <div className="card ghost-border" style={{ marginBottom: 'var(--space-lg)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
            <div style={{
              width: 52, height: 52, borderRadius: '50%',
              background: 'var(--primary-gradient)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--on-primary)', fontFamily: 'var(--font-display)',
              fontWeight: 800, fontSize: '1.25rem', flexShrink: 0,
            }}>
              {getInitials(activeStudent?.full_name || 'S')}
            </div>
            <div>
              <div className="title-md">{activeStudent?.full_name || 'Student'}</div>
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: 3, flexWrap: 'wrap' }}>
                <span className="student-id-badge">{activeStudent?.student_id}</span>
                {activeStudent?.grade && (
                  <span className="label-sm text-surface-variant">{activeStudent.grade}</span>
                )}
              </div>
              <div className="label-sm text-surface-variant" style={{ marginTop: 2 }}>
                {user?.email?.replace('@tuition.internal', '') || ''}
              </div>
            </div>
          </div>
        </div>

        {/* Sibling Accounts */}
        {linkedStudents.length > 1 && (
          <>
            <div className="section-header"><span className="section-title">Accounts</span></div>
            <div className="card-list" style={{ marginBottom: 'var(--space-lg)' }}>
              <div className="card-item" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
                <div style={{ width: 40, height: 40, borderRadius: 'var(--radius-full)', background: 'var(--primary-fixed)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span className="material-symbols-outlined" style={{ color: 'var(--primary)' }}>switch_account</span>
                </div>
                <div style={{ flex: 1 }}>
                  <div className="title-sm">Switch Account</div>
                  <div className="label-sm text-surface-variant">
                    {linkedStudents.length} linked account{linkedStudents.length > 1 ? 's' : ''}
                  </div>
                </div>
                <button className="btn btn-primary btn-sm" onClick={() => setShowSwitch(true)}>
                  Switch
                </button>
              </div>
            </div>
          </>
        )}

        {/* App */}
        <div className="section-header"><span className="section-title">App</span></div>
        <div className="card-list" style={{ marginBottom: 'var(--space-lg)' }}>

          {/* Install */}
          <div className="card-item" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
            <div style={{ width: 40, height: 40, borderRadius: 'var(--radius-full)', background: 'var(--primary-fixed)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <span className="material-symbols-outlined" style={{ color: 'var(--primary)' }}>install_mobile</span>
            </div>
            <div style={{ flex: 1 }}>
              <div className="title-sm">Install App</div>
              <div className="label-sm text-surface-variant">
                {isInstalled ? 'Already installed on this device' : 'Add to home screen for quick access'}
              </div>
            </div>
            {isInstalled ? (
              <span className="chip chip-paid">Installed</span>
            ) : canInstall ? (
              <button className="btn btn-primary btn-sm" onClick={install}>Install</button>
            ) : (
              <span className="label-sm text-surface-variant" style={{ textAlign: 'right', maxWidth: 100 }}>
                Use browser menu → Add to Home Screen
              </span>
            )}
          </div>

          {/* Push Notifications */}
          {pushSupported && (
            <div className="card-item" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
                <div style={{ width: 40, height: 40, borderRadius: 'var(--radius-full)', background: 'var(--primary-fixed)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span className="material-symbols-outlined" style={{ color: 'var(--primary)' }}>notifications</span>
                </div>
                <div style={{ flex: 1 }}>
                  <div className="title-sm">Push Notifications</div>
                  <div className="label-sm text-surface-variant">
                    {!vapidKey ? 'Not configured' : 'Fee alerts & new notices'}
                  </div>
                </div>
                {pushPermission === 'granted' ? (
                  <button className="btn btn-secondary btn-sm" onClick={requestUnsubscribe}>
                    Disable
                  </button>
                ) : pushPermission === 'denied' ? (
                  <span className="label-sm text-surface-variant" style={{ textAlign: 'right', maxWidth: 120 }}>
                    Blocked in browser
                  </span>
                ) : (
                  <button className="btn btn-primary btn-sm" onClick={requestPermission} disabled={pushSubscribing}>
                    {pushSubscribing ? <div className="spinner spinner--sm" /> : 'Enable'}
                  </button>
                )}
              </div>
              {pushPermission === 'granted' && (
                <div style={{ fontSize: '0.8125rem', color: 'var(--secondary)', paddingLeft: 2 }}>
                  ✓ Notifications active on this device
                </div>
              )}
              {pushError && (
                <div style={{
                  background: 'var(--error-container)', color: 'var(--on-error-container)',
                  borderRadius: 'var(--radius-md)', padding: '0.5rem 0.75rem',
                  fontSize: '0.8125rem', display: 'flex', gap: '0.5rem',
                }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '1rem', flexShrink: 0 }}>error</span>
                  <span>{pushError}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Account */}
        <div className="section-header"><span className="section-title">Account</span></div>
        <div className="card-list">
          <div className="card-item" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
            <div style={{ flex: 1 }}>
              <div className="title-sm">Sign Out</div>
              <div className="label-sm text-surface-variant">End your current session</div>
            </div>
            <button className="btn btn-danger btn-sm" onClick={signOut}>Sign Out</button>
          </div>
        </div>

        <div style={{ height: 'var(--space-md)' }} />
      </main>

      <BottomNav role="student" />

      {showSwitch && <SiblingSwitch onClose={() => setShowSwitch(false)} />}
    </div>
  );
}
