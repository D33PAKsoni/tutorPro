// src/pages/teacher/Notices.jsx
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../supabase';
import { useAuth } from '../../context/AuthContext';
import TopBar from '../../components/shared/TopBar';
import BottomNav from '../../components/shared/BottomNav';
import NoticeComposer from '../../components/teacher/NoticeComposer';
import { format } from 'date-fns';

export default function TeacherNotices() {
  const { user } = useAuth();
  const [notices, setNotices] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const [nRes, sRes] = await Promise.all([
      supabase.from('notices').select('*').eq('teacher_id', user.id).order('created_at', { ascending: false }),
      supabase.from('students').select('id, full_name').eq('teacher_id', user.id).eq('is_paused', false),
    ]);
    setNotices(nRes.data || []);
    setStudents(sRes.data || []);
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  async function deleteNotice(id) {
    if (!confirm('Delete this notice?')) return;
    await supabase.from('notices').delete().eq('id', id);
    load();
  }

  async function togglePin(notice) {
    await supabase.from('notices').update({ is_pinned: !notice.is_pinned }).eq('id', notice.id);
    load();
  }

  const pinned = notices.filter(n => n.is_pinned);
  const regular = notices.filter(n => !n.is_pinned);

  return (
    <div className="page-wrapper">
      <TopBar
        title="Notices"
        backTo="/teacher"
        actions={
          <button className="btn btn-primary btn-sm" onClick={() => setShowModal(true)}>
            <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>add</span>
            New
          </button>
        }
      />
      <main className="container" style={{ paddingTop: 'var(--space-lg)' }}>
        {loading ? (
          <div className="card-list">
            {[1,2,3].map(i => <div key={i} className="card-item skeleton" style={{ height: 80 }} />)}
          </div>
        ) : notices.length === 0 ? (
          <div className="empty-state">
            <span className="material-symbols-outlined empty-state__icon">campaign</span>
            <div className="empty-state__title">No notices yet</div>
            <div className="empty-state__body">Create a notice to broadcast to your students</div>
            <button className="btn btn-primary" onClick={() => setShowModal(true)}>Create Notice</button>
          </div>
        ) : (
          <>
            {pinned.length > 0 && (
              <>
                <div className="section-header"><span className="section-title">📌 Pinned</span></div>
                <div className="card-list" style={{ marginBottom: 'var(--space-md)' }}>
                  {pinned.map(n => <NoticeCard key={n.id} notice={n} onDelete={deleteNotice} onPin={togglePin} />)}
                </div>
              </>
            )}
            <div className="section-header"><span className="section-title">All Notices</span></div>
            <div className="card-list">
              {regular.map(n => <NoticeCard key={n.id} notice={n} onDelete={deleteNotice} onPin={togglePin} />)}
            </div>
          </>
        )}
      </main>
      <BottomNav role="teacher" />
      {showModal && (
        <NoticeComposer
          teacherId={user.id}
          students={students}
          onClose={() => setShowModal(false)}
          onSaved={() => { setShowModal(false); load(); }}
        />
      )}
    </div>
  );
}

function NoticeCard({ notice, onDelete, onPin }) {
  const recipientLabel = notice.recipient_type === 'all' ? 'All Students' :
    notice.recipient_type === 'group' ? notice.recipient_group : 'Individual';

  return (
    <div className="card-item" style={{ display: 'flex', gap: 'var(--space-md)' }}>
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: 4 }}>
          <span className="title-sm">{notice.title}</span>
          <span className="chip chip-pending">{recipientLabel}</span>
        </div>
        <div className="body-md text-surface-variant" style={{ WebkitLineClamp: 2, overflow: 'hidden', display: '-webkit-box', WebkitBoxOrient: 'vertical' }}>
          {notice.content}
        </div>
        <div className="label-sm text-surface-variant" style={{ marginTop: 4 }}>
          {format(new Date(notice.created_at), 'dd MMM yyyy, hh:mm a')}
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <button className="top-bar__icon-btn" onClick={() => onPin(notice)} title={notice.is_pinned ? 'Unpin' : 'Pin'}>
          <span className="material-symbols-outlined" style={{ fontSize: '1rem', fontVariationSettings: notice.is_pinned ? "'FILL' 1" : "'FILL' 0" }}>push_pin</span>
        </button>
        <button className="top-bar__icon-btn" onClick={() => onDelete(notice.id)} style={{ color: 'var(--error)' }} title="Delete">
          <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>delete</span>
        </button>
      </div>
    </div>
  );
}

// NoticeComposer component handles notice creation — see src/components/teacher/NoticeComposer.jsx
