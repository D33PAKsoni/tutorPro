// src/pages/auth/GoogleCallback.jsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { handleGoogleCallback } from '../../lib/googleDrive';

export default function GoogleCallback() {
  const navigate = useNavigate();
  const [status, setStatus] = useState('Linking Google Drive...');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const error = params.get('error');

    if (error) {
      setStatus('Google Drive link cancelled');
      setTimeout(() => navigate('/teacher/settings'), 2000);
      return;
    }
    if (!code) {
      navigate('/teacher/settings');
      return;
    }

    handleGoogleCallback(code)
      .then(() => {
        setStatus('Google Drive linked! Redirecting...');
        setTimeout(() => navigate('/teacher/settings'), 1500);
      })
      .catch(e => {
        setStatus(`Error: ${e.message}`);
        setTimeout(() => navigate('/teacher/settings'), 3000);
      });
  }, [navigate]);

  return (
    <div className="auth-page">
      <div style={{ textAlign: 'center' }}>
        <div className="spinner spinner--lg" style={{ margin: '0 auto 1.5rem' }} />
        <div className="title-md">{status}</div>
      </div>
    </div>
  );
}
