// src/pages/auth/Login.jsx
import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function Login() {
  const { loginTeacher, loginStudent } = useAuth();
  const location = useLocation();
  const [mode, setMode] = useState('teacher'); // 'teacher' | 'student'
  const [form, setForm] = useState({ identifier: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Show a helpful message when redirected due to missing profile row
  const profileMissing = location.state?.error === 'profile_missing';

  async function handleLogin() {
    if (!form.identifier || !form.password) { setError('Please fill in all fields'); return; }
    setLoading(true);
    setError('');
    try {
      const result = mode === 'teacher'
        ? await loginTeacher({ email: form.identifier, password: form.password })
        : await loginStudent({ username: form.identifier, password: form.password });
      if (result.error) throw result.error;
    } catch (e) {
      setError(e.message === 'Invalid login credentials' ? 'Incorrect username or password' : e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <span className="material-symbols-outlined auth-logo__icon">school</span>
          <span className="auth-logo__text">Tuition Pro</span>
        </div>

        {/* Show when DB trigger didn't create a profile row */}
        {profileMissing && (
          <div style={{
            background: 'var(--tertiary-fixed)', color: 'var(--on-tertiary-fixed-variant)',
            padding: 'var(--space-md)', borderRadius: 'var(--radius-md)',
            fontSize: '0.8125rem', lineHeight: 1.5, marginBottom: 'var(--space-md)',
          }}>
            <strong>Setup issue detected.</strong> Your account was created but a profile row
            is missing in the database. This usually means the <code>handle_new_user</code> trigger
            hasn't been applied yet. Please run the SQL schema from BLUEPRINT.md in your
            Supabase SQL Editor, then sign in again.
          </div>
        )}

        {/* Role toggle */}
        <div className="tabs" style={{ marginBottom: 'var(--space-lg)' }}>
          <button className={`tab-btn${mode === 'teacher' ? ' tab-btn--active' : ''}`} style={{ flex: 1 }} onClick={() => { setMode('teacher'); setError(''); }}>
            Teacher
          </button>
          <button className={`tab-btn${mode === 'student' ? ' tab-btn--active' : ''}`} style={{ flex: 1 }} onClick={() => { setMode('student'); setError(''); }}>
            Student
          </button>
        </div>

        <div className="auth-title">Sign In</div>
        <div className="auth-subtitle">
          {mode === 'teacher' ? 'Enter your registered email address' : 'Enter your username given by your teacher'}
        </div>

        {error && (
          <div style={{ background: 'var(--error-container)', color: 'var(--on-error-container)', padding: '0.75rem', borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-md)', fontSize: '0.875rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>error</span>
            {error}
          </div>
        )}

        <div className="field">
          <label className="field__label">{mode === 'teacher' ? 'Email Address' : 'Username'}</label>
          <input
            className="field__input"
            type={mode === 'teacher' ? 'email' : 'text'}
            placeholder={mode === 'teacher' ? 'teacher@example.com' : 'e.g. john123'}
            value={form.identifier}
            onChange={e => setForm(p => ({ ...p, identifier: e.target.value }))}
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
            autoComplete={mode === 'teacher' ? 'email' : 'username'}
          />
        </div>

        <div className="field">
          <label className="field__label">Password</label>
          <input
            className="field__input"
            type="password"
            placeholder="Your password"
            value={form.password}
            onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
            autoComplete="current-password"
          />
        </div>

        <button className="btn btn-primary btn-lg" onClick={handleLogin} disabled={loading} style={{ marginTop: 'var(--space-sm)' }}>
          {loading ? <div className="spinner spinner--sm" style={{ borderTopColor: 'white' }} /> : 'Sign In'}
        </button>

        {mode === 'teacher' && (
          <div className="auth-footer-link">
            Don't have an account? <Link to="/register">Register as Teacher</Link>
          </div>
        )}
      </div>
    </div>
  );
}
