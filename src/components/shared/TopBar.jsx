// src/components/shared/TopBar.jsx
import { Link } from 'react-router-dom';

export default function TopBar({ title, actions, backTo }) {
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
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1rem', color: 'var(--on-surface)', marginLeft: 'var(--space-sm)' }}>
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
