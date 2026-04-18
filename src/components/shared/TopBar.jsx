// src/components/shared/TopBar.jsx
import { Link } from 'react-router-dom';
import { usePWAInstall } from '../../hooks/usePWA';

export default function TopBar({ title, actions, backTo }) {
  const { canInstall, install } = usePWAInstall();

  return (
    <header className="top-bar">
      <div className="top-bar__brand">
        {backTo ? (
          <Link to={backTo} className="top-bar__icon-btn" style={{ textDecoration: 'none' }}>
            <span className="material-symbols-outlined">arrow_back</span>
          </Link>
        ) : (
          <>
            <span className="material-symbols-outlined top-bar__brand-icon">school</span>
            <span className="top-bar__brand-name">Tuition Pro</span>
          </>
        )}
        {title && backTo && (
          <span style={{
            fontFamily: 'var(--font-display)', fontWeight: 700,
            fontSize: '1rem', color: 'var(--on-surface)',
            marginLeft: 'var(--space-sm)',
          }}>
            {title}
          </span>
        )}
      </div>

      <div className="top-bar__actions">
        {/* Install button — shown when browser supports the install prompt */}
        {canInstall && (
          <button
            className="top-bar__action-btn"
            onClick={install}
            title="Install Tuition Pro on your device"
          >
            <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>
              install_mobile
            </span>
            Install
          </button>
        )}
        {actions}
      </div>
    </header>
  );
}
