// src/pages/auth/Register.jsx
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function Register() {
  const { registerTeacher } = useAuth();
  const [form, setForm] = useState({ fullName: '', email: '', password: '', confirm: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  async function handleRegister() {
    if (!form.fullName || !form.email || !form.password) { setError('All fields are required'); return; }
    if (form.password !== form.confirm) { setError('Passwords do not match'); return; }
    if (form.password.length < 8) { setError('Password must be at least 8 characters'); return; }
    setLoading(true);
    setError('');
    const { error: err } = await registerTeacher({ email: form.email, password: form.password, fullName: form.fullName });
    if (err) { setError(err.message); setLoading(false); return; }
    setSuccess(true);
    setLoading(false);
  }

  if (success) return (
    <div className="auth-page">
      <div className="auth-card" style={{ textAlign: 'center' }}>
        <span className="material-symbols-outlined icon-filled" style={{ fontSize: '3rem', color: 'var(--primary)', display: 'block', marginBottom: 'var(--space-md)' }}>mark_email_read</span>
        <div className="auth-title">Check Your Email</div>
        <p className="auth-subtitle" style={{ marginBottom: 'var(--space-lg)' }}>
          We've sent a confirmation to <strong>{form.email}</strong>. Click the link to activate your account.
        </p>
        <Link to="/login" className="btn btn-primary btn-lg" style={{ textDecoration: 'none', display: 'flex', justifyContent: 'center' }}>Back to Login</Link>
      </div>
    </div>
  );

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <span className="material-symbols-outlined auth-logo__icon">school</span>
          <span className="auth-logo__text">Tuition Pro</span>
        </div>
        <div className="auth-title">Create Teacher Account</div>
        <div className="auth-subtitle">Open registration for educators</div>

        {error && (
          <div style={{ background: 'var(--error-container)', color: 'var(--on-error-container)', padding: '0.75rem', borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-md)', fontSize: '0.875rem' }}>
            {error}
          </div>
        )}

        <div className="field">
          <label className="field__label">Full Name</label>
          <input className="field__input" placeholder="Your full name" value={form.fullName} onChange={e => setForm(p => ({...p, fullName: e.target.value}))} />
        </div>
        <div className="field">
          <label className="field__label">Email Address</label>
          <input className="field__input" type="email" placeholder="you@example.com" value={form.email} onChange={e => setForm(p => ({...p, email: e.target.value}))} />
        </div>
        <div className="field">
          <label className="field__label">Password</label>
          <input className="field__input" type="password" placeholder="Minimum 8 characters" value={form.password} onChange={e => setForm(p => ({...p, password: e.target.value}))} />
        </div>
        <div className="field">
          <label className="field__label">Confirm Password</label>
          <input className="field__input" type="password" placeholder="Repeat password" value={form.confirm} onChange={e => setForm(p => ({...p, confirm: e.target.value}))} onKeyDown={e => e.key === 'Enter' && handleRegister()} />
        </div>

        <button className="btn btn-primary btn-lg" onClick={handleRegister} disabled={loading}>
          {loading ? <div className="spinner spinner--sm" style={{ borderTopColor: 'white' }} /> : 'Create Account'}
        </button>

        <div className="auth-footer-link">
          Already have an account? <Link to="/login">Sign In</Link>
        </div>
      </div>
    </div>
  );
}
