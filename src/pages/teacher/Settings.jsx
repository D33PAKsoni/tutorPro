// src/pages/teacher/Settings.jsx
import { useState } from 'react';
import { supabase } from '../../supabase';
import { useAuth } from '../../context/AuthContext';
import TopBar from '../../components/shared/TopBar';
import BottomNav from '../../components/shared/BottomNav';
import { initiateGoogleOAuth, backupToDrive } from '../../lib/googleDrive';
import { exportLocalBackup, importLocalBackup } from '../../lib/backup';
import { usePWAInstall, usePushPermission } from '../../hooks/usePWA';

export default function TeacherSettings() {
  const { user, profile, signOut } = useAuth();
  const [backing, setBacking] = useState(false);
  const [importing, setImporting] = useState(false);
  const [pushStatus, setPushStatus] = useState('idle');
  const [msg, setMsg] = useState(null);

  const { canInstall, isInstalled, install } = usePWAInstall();
  const { permission: pushPermission, supported: pushSupported, requestPermission } = usePushPermission();

  function showMsg(text, type = 'success') {
    setMsg({ text, type });
    setTimeout(() => setMsg(null), 3000);
  }

  async function handleDriveBackup() {
    setBacking(true);
    try {
      await backupToDrive(supabase, user.id);
      showMsg('Backup uploaded to Google Drive!');
    } catch (e) {
      showMsg(e.message || 'Backup failed', 'error');
    } finally {
      setBacking(false);
    }
  }

  async function handleLocalExport() {
    setBacking(true);
    try {
      await exportLocalBackup(supabase);
      showMsg('Backup file downloaded!');
    } catch (e) {
      showMsg('Export failed', 'error');
    } finally {
      setBacking(false);
    }
  }

  async function handleLocalImport(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const result = await importLocalBackup(supabase, file, user.id);
      showMsg(`Restored ${result.students} students, ${result.attendance} attendance records`);
    } catch (e) {
      showMsg(e.message || 'Import failed', 'error');
    } finally {
      setImporting(false);
      e.target.value = '';
    }
  }

  const hasDrive = !!profile?.google_drive_token;

  return (
    <div className="page-wrapper">
      <TopBar title="Settings" backTo="/teacher" />
      <main className="container" style={{ paddingTop: 'var(--space-lg)' }}>

        {msg && (
          <div className={`toast toast--${msg.type}`} style={{ position: 'static', marginBottom: 'var(--space-md)', animation: 'none' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>
              {msg.type === 'success' ? 'check_circle' : 'error'}
            </span>
            {msg.text}
          </div>
        )}

        {/* Profile section */}
        <div className="card ghost-border" style={{ marginBottom: 'var(--space-lg)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
            <div style={{
              width: 52, height: 52, borderRadius: '50%', background: 'var(--primary-gradient)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--on-primary)', fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.25rem'
            }}>
              {(profile?.full_name || 'T').charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="title-md">{profile?.full_name || 'Teacher'}</div>
              <div className="label-sm text-surface-variant">{user?.email}</div>
              <span className="chip chip-paid">Teacher Account</span>
            </div>
          </div>
        </div>

        {/* Backup Section */}
        <div className="section-header"><span className="section-title">Backup & Restore</span></div>

        <div className="card-list" style={{ marginBottom: 'var(--space-lg)' }}>
          {/* Google Drive */}
          <div className="card-item" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
            <div style={{ width: 40, height: 40, borderRadius: 'var(--radius-full)', background: 'var(--secondary-container)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <span className="material-symbols-outlined" style={{ color: 'var(--secondary)' }}>add_to_drive</span>
            </div>
            <div style={{ flex: 1 }}>
              <div className="title-sm">Google Drive</div>
              <div className="label-sm text-surface-variant">
                {hasDrive ? 'Linked — auto-backup monthly' : 'Not linked yet'}
              </div>
            </div>
            {hasDrive ? (
              <button className="btn btn-secondary btn-sm" onClick={handleDriveBackup} disabled={backing}>
                {backing ? <div className="spinner spinner--sm" /> : 'Backup Now'}
              </button>
            ) : (
              <button className="btn btn-primary btn-sm" onClick={initiateGoogleOAuth}>
                Link Drive
              </button>
            )}
          </div>

          {/* Local Export */}
          <div className="card-item" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
            <div style={{ width: 40, height: 40, borderRadius: 'var(--radius-full)', background: 'var(--primary-fixed)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <span className="material-symbols-outlined" style={{ color: 'var(--primary)' }}>download</span>
            </div>
            <div style={{ flex: 1 }}>
              <div className="title-sm">Local Export</div>
              <div className="label-sm text-surface-variant">Download all data as JSON</div>
            </div>
            <button className="btn btn-secondary btn-sm" onClick={handleLocalExport} disabled={backing}>
              Export
            </button>
          </div>

          {/* Local Import */}
          <div className="card-item" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
            <div style={{ width: 40, height: 40, borderRadius: 'var(--radius-full)', background: 'var(--tertiary-fixed)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <span className="material-symbols-outlined" style={{ color: 'var(--on-tertiary-fixed-variant)' }}>upload</span>
            </div>
            <div style={{ flex: 1 }}>
              <div className="title-sm">Local Import</div>
              <div className="label-sm text-surface-variant">Restore from JSON backup</div>
            </div>
            <label className="btn btn-secondary btn-sm" style={{ cursor: 'pointer' }}>
              {importing ? <div className="spinner spinner--sm" /> : 'Import'}
              <input type="file" accept=".json" style={{ display: 'none' }} onChange={handleLocalImport} />
            </label>
          </div>
        </div>

        {/* Install App */}
        <div className="section-header"><span className="section-title">App</span></div>
        <div className="card-list" style={{ marginBottom: 'var(--space-lg)' }}>
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
              <button className="btn btn-primary btn-sm" onClick={install}>
                Install
              </button>
            ) : (
              <span className="label-sm text-surface-variant" style={{ textAlign: 'right', maxWidth: 100 }}>
                Use browser menu → Add to Home Screen
              </span>
            )}
          </div>

          {/* Push Notifications */}
          {pushSupported && (
            <div className="card-item" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
              <div style={{ width: 40, height: 40, borderRadius: 'var(--radius-full)', background: 'var(--primary-fixed)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span className="material-symbols-outlined" style={{ color: 'var(--primary)' }}>notifications</span>
              </div>
              <div style={{ flex: 1 }}>
                <div className="title-sm">Push Notifications</div>
                <div className="label-sm text-surface-variant">Overdue fee alerts & reminders</div>
              </div>
              {pushPermission === 'granted' ? (
                <span className="chip chip-paid">Enabled</span>
              ) : pushPermission === 'denied' ? (
                <span className="label-sm text-surface-variant">Blocked in browser</span>
              ) : (
                <button className="btn btn-primary btn-sm" onClick={async () => {
                  setPushStatus('loading');
                  await requestPermission();
                  setPushStatus('idle');
                }} disabled={pushStatus === 'loading'}>
                  {pushStatus === 'loading' ? <div className="spinner spinner--sm" /> : 'Enable'}
                </button>
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
      <BottomNav role="teacher" />
    </div>
  );
}
