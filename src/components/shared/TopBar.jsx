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
            {/* Brand name doubles as install button when PWA is installable */}
            {canInstall ? (
              <button
                className="top-bar__brand-name top-bar__install-btn"
                onClick={install}
                title="Install Tuition Pro app"
              >
                Tuition Pro
                <span
                  className="material-symbols-outlined"
                  style={{ fontSize: '0.875rem', marginLeft: '0.25rem', verticalAlign: 'middle' }}
                >
                  install_mobile
                </span>
              </button>
            ) : (
              <span className="top-bar__brand-name">Tuition Pro</span>
            )}
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
        {actions}
      </div>
    </header>
  );
}
