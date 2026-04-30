// src/pages/student/Notices.jsx
import { useState, useEffect } from 'react';
import { supabase } from '../../supabase';
import { useStudent } from '../../context/StudentContext';
import TopBar from '../../components/shared/TopBar';
import BottomNav from '../../components/shared/BottomNav';
import { format } from 'date-fns';

export default function StudentNotices() {
  const { activeStudent } = useStudent();
  const [notices, setNotices]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [expanded, setExpanded] = useState(null);
  const [lightbox, setLightbox] = useState(null); // full-screen image url

  useEffect(() => {
    if (!activeStudent) return;
    setLoading(true);
    supabase
      .from('notices')
      .select('*')
      .eq('teacher_id', activeStudent.teacher_id)
      .order('is_pinned',   { ascending: false })
      .order('created_at',  { ascending: false })
      .then(({ data }) => {
        // Filter individual-addressed notices to only those for this student
        const filtered = (data || []).filter(n =>
          n.recipient_type === 'all' ||
          n.recipient_type === 'group' ||
          (n.recipient_type === 'individual' && (n.recipient_student_ids || []).includes(activeStudent.id))
        );
        setNotices(filtered);
        setLoading(false);
      });
  }, [activeStudent?.id]);

  return (
    <div className="page-wrapper">
      <TopBar title="Notices" backTo="/student" />

      <main className="container" style={{ paddingTop: 'var(--space-lg)' }}>
        {loading ? (
          <div className="card-list">
            {[1,2,3].map(i => <div key={i} className="card-item skeleton" style={{ height: 72 }} />)}
          </div>
        ) : notices.length === 0 ? (
          <div className="empty-state">
            <span className="material-symbols-outlined empty-state__icon">notifications_none</span>
            <div className="empty-state__title">No notices yet</div>
            <div className="empty-state__body">Notices from your teacher will appear here</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
            {notices.map(notice => (
              <NoticeCard
                key={notice.id}
                notice={notice}
                isExpanded={expanded === notice.id}
                onToggle={() => setExpanded(expanded === notice.id ? null : notice.id)}
                onImageClick={url => setLightbox(url)}
              />
            ))}
          </div>
        )}
      </main>

      <BottomNav role="student" />

      {/* Lightbox */}
      {lightbox && (
        <div
          onClick={() => setLightbox(null)}
          style={{
            position: 'fixed', inset: 0, zIndex: 999,
            background: 'rgba(0,0,0,0.92)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '1rem',
          }}
        >
          <button
            onClick={() => setLightbox(null)}
            style={{
              position: 'absolute', top: 16, right: 16,
              background: 'rgba(255,255,255,0.15)', border: 'none',
              borderRadius: '50%', width: 36, height: 36,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', color: '#fff',
            }}
          >
            <span className="material-symbols-outlined">close</span>
          </button>
          <img
            src={lightbox}
            alt="Notice attachment"
            style={{
              maxWidth: '100%', maxHeight: '90dvh',
              borderRadius: 'var(--radius-lg)',
              boxShadow: '0 8px 40px rgba(0,0,0,0.6)',
              objectFit: 'contain',
            }}
            onClick={e => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}

function NoticeCard({ notice, isExpanded, onToggle, onImageClick }) {
  const isPinned = notice.is_pinned;

  return (
    <div
      style={{
        background: isPinned
          ? 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)'
          : 'var(--surface)',
        border: isPinned
          ? '1px solid rgba(129,140,248,0.25)'
          : '1px solid var(--outline-variant)',
        borderRadius: 'var(--radius-lg)',
        overflow: 'hidden',
        boxShadow: isPinned ? '0 4px 16px rgba(99,102,241,0.15)' : 'none',
        transition: 'box-shadow 0.2s',
      }}
    >
      {/* Header row — always visible */}
      <div
        onClick={onToggle}
        style={{
          display: 'flex', gap: 'var(--space-md)', alignItems: 'flex-start',
          padding: 'var(--space-md)',
          cursor: 'pointer',
        }}
      >
        {/* Icon */}
        <div style={{
          width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
          background: isPinned ? 'rgba(129,140,248,0.2)' : 'var(--secondary-container)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <span
            className="material-symbols-outlined icon-filled"
            style={{
              color: isPinned ? '#a5b4fc' : 'var(--secondary)',
              fontSize: '1.125rem',
            }}
          >
            {isPinned ? 'push_pin' : 'campaign'}
          </span>
        </div>

        {/* Text */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 700,
              fontSize: '0.9375rem',
              color: isPinned ? '#e0e7ff' : 'var(--on-surface)',
              marginBottom: 2,
            }}
          >
            {notice.title}
          </div>
          <div
            className="label-sm"
            style={{ color: isPinned ? 'rgba(224,231,255,0.55)' : 'var(--on-surface-variant)' }}
          >
            {format(new Date(notice.created_at), 'dd MMM yyyy · hh:mm a')}
          </div>

          {/* Image thumbnail hint */}
          {notice.image_url && !isExpanded && (
            <div
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                marginTop: 4,
                fontSize: '0.75rem',
                color: isPinned ? '#a5b4fc' : 'var(--primary)',
                fontWeight: 600,
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '0.875rem' }}>image</span>
              Attachment
            </div>
          )}
        </div>

        {/* Chevron */}
        <span
          className="material-symbols-outlined"
          style={{
            color: isPinned ? 'rgba(224,231,255,0.5)' : 'var(--on-surface-variant)',
            fontSize: '1.25rem', flexShrink: 0,
            transition: 'transform 0.2s',
            transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
          }}
        >
          expand_more
        </span>
      </div>

      {/* Expanded body */}
      {isExpanded && (
        <div
          style={{
            padding: '0 var(--space-md) var(--space-md)',
            animation: 'fadeSlideUp 0.2s ease',
          }}
        >
          {/* Divider */}
          <div style={{
            height: 1,
            background: isPinned ? 'rgba(129,140,248,0.15)' : 'var(--outline-variant)',
            marginBottom: 'var(--space-md)',
          }} />

          {/* Content text */}
          <div
            style={{
              fontSize: '0.9rem',
              lineHeight: 1.6,
              color: isPinned ? 'rgba(224,231,255,0.85)' : 'var(--on-surface-variant)',
              whiteSpace: 'pre-wrap',
              marginBottom: notice.image_url ? 'var(--space-md)' : 0,
            }}
          >
            {notice.content}
          </div>

          {/* Attached image */}
          {notice.image_url && (
            <div
              onClick={() => onImageClick(notice.image_url)}
              style={{
                borderRadius: 'var(--radius-md)',
                overflow: 'hidden',
                cursor: 'zoom-in',
                border: isPinned
                  ? '1px solid rgba(129,140,248,0.2)'
                  : '1px solid var(--outline-variant)',
                position: 'relative',
              }}
            >
              <img
                src={notice.image_url}
                alt="Attachment"
                style={{ width: '100%', maxHeight: 240, objectFit: 'cover', display: 'block' }}
              />
              <div style={{
                position: 'absolute', bottom: 8, right: 8,
                background: 'rgba(0,0,0,0.5)', borderRadius: 'var(--radius-sm)',
                padding: '2px 6px', display: 'flex', alignItems: 'center', gap: 3,
                color: '#fff', fontSize: '0.7rem', fontWeight: 600,
              }}>
                <span className="material-symbols-outlined" style={{ fontSize: '0.875rem' }}>zoom_in</span>
                Tap to expand
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
