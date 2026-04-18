// src/pages/student/Notices.jsx
import { useState, useEffect } from 'react';
import { supabase } from '../../supabase';
import { useStudent } from '../../context/StudentContext';
import TopBar from '../../components/shared/TopBar';
import BottomNav from '../../components/shared/BottomNav';
import { format } from 'date-fns';

export default function StudentNotices() {
  const { activeStudent } = useStudent();
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    if (!activeStudent) return;
    setLoading(true);
    supabase.from('notices').select('*').order('is_pinned', { ascending: false }).order('created_at', { ascending: false })
      .then(({ data }) => { setNotices(data || []); setLoading(false); });
  }, [activeStudent?.id]);

  return (
    <div className="page-wrapper">
      <TopBar title="Notices" backTo="/student" />
      <main className="container" style={{ paddingTop: 'var(--space-lg)' }}>
        {loading ? (
          <div className="card-list">{[1,2,3].map(i => <div key={i} className="card-item skeleton" style={{ height: 72 }} />)}</div>
        ) : notices.length === 0 ? (
          <div className="empty-state">
            <span className="material-symbols-outlined empty-state__icon">notifications_none</span>
            <div className="empty-state__title">No notices yet</div>
            <div className="empty-state__body">Notices from your teacher will appear here</div>
          </div>
        ) : (
          <div className="card-list">
            {notices.map(notice => (
              <div key={notice.id} className="card-item card-item--clickable" onClick={() => setExpanded(expanded === notice.id ? null : notice.id)}>
                <div style={{ display: 'flex', gap: 'var(--space-md)', alignItems: 'flex-start' }}>
                  <div style={{ width: 40, height: 40, borderRadius: '50%', background: notice.is_pinned ? 'var(--primary-fixed)' : 'var(--secondary-container)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <span className="material-symbols-outlined icon-filled" style={{ color: notice.is_pinned ? 'var(--primary)' : 'var(--secondary)', fontSize: '1.125rem' }}>
                      {notice.is_pinned ? 'push_pin' : 'campaign'}
                    </span>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div className="title-sm">{notice.title}</div>
                    <div className="label-sm text-surface-variant">{format(new Date(notice.created_at), 'dd MMM yyyy')}</div>
                    {expanded === notice.id && (
                      <div className="body-md text-surface-variant" style={{ marginTop: 'var(--space-sm)', animation: 'fadeSlideUp 0.2s ease' }}>
                        {notice.content}
                      </div>
                    )}
                  </div>
                  <span className="material-symbols-outlined" style={{ color: 'var(--on-surface-variant)', fontSize: '1.25rem', flexShrink: 0, transition: 'transform 0.2s', transform: expanded === notice.id ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                    expand_more
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
      <BottomNav role="student" />
    </div>
  );
}
