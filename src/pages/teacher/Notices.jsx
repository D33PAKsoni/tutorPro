// src/pages/teacher/Notices.jsx
import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../../supabase';
import { useAuth } from '../../context/AuthContext';
import TopBar from '../../components/shared/TopBar';
import BottomNav from '../../components/shared/BottomNav';
import { format } from 'date-fns';

export default function TeacherNotices() {
  const { user } = useAuth();
  const [notices, setNotices] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [viewNotice, setViewNotice] = useState(null); // notice to view recipients for

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const [nRes, sRes] = await Promise.all([
      supabase.from('notices').select('*').eq('teacher_id', user.id).order('created_at', { ascending: false }),
      supabase.from('students').select('id, full_name, student_id').eq('teacher_id', user.id),
    ]);
    setNotices(nRes.data || []);
    setStudents(sRes.data || []);
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  async function deleteNotice(id) {
    if (!confirm('Delete this notice?')) return;
    // Remove image from storage (stored in subfolder named after notice id)
    const { data: files } = await supabase.storage.from('notice-images').list(id);
    if (files?.length) {
      const paths = files.map(f => `${id}/${f.name}`);
      await supabase.storage.from('notice-images').remove(paths);
    }
    await supabase.from('notices').delete().eq('id', id);
    load();
  }

  async function togglePin(notice) {
    await supabase.from('notices').update({ is_pinned: !notice.is_pinned }).eq('id', notice.id);
    load();
  }

  const pinned  = notices.filter(n => n.is_pinned);
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
                  {pinned.map(n => (
                    <NoticeCard
                      key={n.id} notice={n} students={students}
                      onDelete={deleteNotice} onPin={togglePin}
                      onViewRecipients={() => setViewNotice(n)}
                    />
                  ))}
                </div>
              </>
            )}
            <div className="section-header"><span className="section-title">All Notices</span></div>
            <div className="card-list">
              {regular.map(n => (
                <NoticeCard
                  key={n.id} notice={n} students={students}
                  onDelete={deleteNotice} onPin={togglePin}
                  onViewRecipients={() => setViewNotice(n)}
                />
              ))}
            </div>
          </>
        )}
      </main>

      <BottomNav role="teacher" />

      {showModal && (
        <NoticeModal
          teacherId={user.id}
          students={students}
          onClose={() => setShowModal(false)}
          onSaved={() => { setShowModal(false); load(); }}
        />
      )}

      {viewNotice && (
        <RecipientsModal
          notice={viewNotice}
          students={students}
          onClose={() => setViewNotice(null)}
        />
      )}
    </div>
  );
}

// ── NoticeCard ───────────────────────────────────────────────────────────────
function NoticeCard({ notice, students, onDelete, onPin, onViewRecipients }) {
  const [imgExpanded, setImgExpanded] = useState(false);

  const recipientLabel =
    notice.recipient_type === 'all'        ? 'All Students' :
    notice.recipient_type === 'group'      ? (notice.recipient_group || 'Group') :
    /* individual */
    (() => {
      const ids  = notice.recipient_student_ids || [];
      const names = ids.map(id => students.find(s => s.id === id)?.full_name || '?');
      if (names.length === 0) return 'Individual';
      if (names.length <= 2)  return names.join(', ');
      return `${names[0]} +${names.length - 1} more`;
    })();

  const recipientCount =
    notice.recipient_type === 'all'        ? students.length :
    notice.recipient_type === 'individual' ? (notice.recipient_student_ids || []).length : null;

  return (
    <div className="card-item" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
      <div style={{ display: 'flex', gap: 'var(--space-md)' }}>

        {/* Content */}
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap', marginBottom: 4 }}>
            <span className="title-sm">{notice.title}</span>
            {notice.is_pinned && (
              <span className="material-symbols-outlined icon-filled" style={{ fontSize: '0.875rem', color: 'var(--primary)' }}>push_pin</span>
            )}
          </div>
          <div className="body-sm text-surface-variant" style={{
            WebkitLineClamp: 2, overflow: 'hidden',
            display: '-webkit-box', WebkitBoxOrient: 'vertical',
          }}>
            {notice.content}
          </div>
          <div className="label-sm text-surface-variant" style={{ marginTop: 4 }}>
            {format(new Date(notice.created_at), 'dd MMM yyyy, hh:mm a')}
          </div>

          {/* Recipients row — tappable */}
          <button
            onClick={onViewRecipients}
            style={{
              marginTop: 8, display: 'inline-flex', alignItems: 'center', gap: 4,
              background: 'var(--surface-variant)', border: 'none',
              borderRadius: 'var(--radius-sm)', padding: '3px 8px',
              cursor: 'pointer', color: 'var(--on-surface-variant)',
              fontFamily: 'var(--font-body)', fontSize: '0.75rem', fontWeight: 600,
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '0.875rem' }}>group</span>
            {recipientLabel}
            {recipientCount !== null && (
              <span style={{ marginLeft: 2, opacity: 0.7 }}>({recipientCount})</span>
            )}
            <span className="material-symbols-outlined" style={{ fontSize: '0.75rem', opacity: 0.6 }}>open_in_new</span>
          </button>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flexShrink: 0 }}>
          <button className="top-bar__icon-btn" onClick={() => onPin(notice)} title={notice.is_pinned ? 'Unpin' : 'Pin'}>
            <span className="material-symbols-outlined" style={{ fontSize: '1rem', fontVariationSettings: notice.is_pinned ? "'FILL' 1" : "'FILL' 0" }}>push_pin</span>
          </button>
          {notice.image_url && (
            <button className="top-bar__icon-btn" onClick={() => setImgExpanded(e => !e)} title="View image">
              <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>image</span>
            </button>
          )}
          <button className="top-bar__icon-btn" onClick={() => onDelete(notice.id)} style={{ color: 'var(--error)' }} title="Delete">
            <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>delete</span>
          </button>
        </div>
      </div>

      {/* Expandable image */}
      {notice.image_url && imgExpanded && (
        <div style={{ borderRadius: 'var(--radius-md)', overflow: 'hidden', maxHeight: 280 }}>
          <img
            src={notice.image_url}
            alt="Notice attachment"
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        </div>
      )}
    </div>
  );
}

// ── RecipientsModal ──────────────────────────────────────────────────────────
function RecipientsModal({ notice, students, onClose }) {
  const allStudents = students;

  const recipientStudents =
    notice.recipient_type === 'all'        ? allStudents :
    notice.recipient_type === 'individual' ?
      allStudents.filter(s => (notice.recipient_student_ids || []).includes(s.id)) :
    /* group */ allStudents; // group has no per-student filter, show all

  const typeLabel =
    notice.recipient_type === 'all'        ? 'Sent to all students' :
    notice.recipient_type === 'group'      ? `Sent to group: ${notice.recipient_group || '—'}` :
    `Sent to ${recipientStudents.length} individual student${recipientStudents.length !== 1 ? 's' : ''}`;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" onClick={e => e.stopPropagation()} style={{ maxHeight: '80dvh', overflowY: 'auto' }}>
        <div className="modal-handle" />
        <div className="modal-title">Recipients</div>

        {/* Notice summary */}
        <div style={{
          background: 'var(--surface-variant)', borderRadius: 'var(--radius-md)',
          padding: 'var(--space-sm) var(--space-md)', marginBottom: 'var(--space-md)',
        }}>
          <div className="title-sm">{notice.title}</div>
          <div className="label-sm text-surface-variant" style={{ marginTop: 2 }}>
            {format(new Date(notice.created_at), 'dd MMM yyyy · hh:mm a')}
          </div>
        </div>

        {/* Type badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 'var(--space-md)' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '1rem', color: 'var(--primary)' }}>group</span>
          <span className="label-sm" style={{ color: 'var(--primary)', fontWeight: 600 }}>{typeLabel}</span>
        </div>

        {recipientStudents.length === 0 ? (
          <div className="empty-state" style={{ padding: 'var(--space-lg) 0' }}>
            <span className="material-symbols-outlined empty-state__icon" style={{ fontSize: '2rem' }}>group_off</span>
            <div className="empty-state__body">No students matched</div>
          </div>
        ) : (
          <div className="card-list">
            {recipientStudents.map(s => (
              <div key={s.id} className="card-item" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
                <div className="student-avatar" style={{ flexShrink: 0 }}>
                  {s.full_name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0,2)}
                </div>
                <div>
                  <div className="title-sm">{s.full_name}</div>
                  <span className="student-id-badge">{s.student_id}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        <button className="btn btn-tertiary" style={{ width: '100%', marginTop: 'var(--space-md)' }} onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
}

// ── NoticeModal ──────────────────────────────────────────────────────────────
function NoticeModal({ teacherId, students, onClose, onSaved }) {
  const [form, setForm] = useState({
    title: '', content: '',
    recipient_type: 'all',
    recipient_student_ids: [],
    recipient_group: '',
  });
  const [imageFile, setImageFile]   = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [saving, setSaving]         = useState(false);
  const fileRef                     = useRef();

  function handleImagePick(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    // Max 5 MB
    if (file.size > 5 * 1024 * 1024) {
      alert('Image must be smaller than 5 MB');
      return;
    }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  }

  function removeImage() {
    setImageFile(null);
    setImagePreview(null);
    if (fileRef.current) fileRef.current.value = '';
  }

  async function handleSave() {
    if (!form.title.trim() || !form.content.trim()) return;
    setSaving(true);

    // 1. Insert notice first to get the id
    const { data: inserted, error: insertErr } = await supabase
      .from('notices')
      .insert({ ...form, teacher_id: teacherId })
      .select('id')
      .single();

    if (insertErr || !inserted) {
      console.error('[Notices] insert failed', insertErr);
      setSaving(false);
      return;
    }

    const noticeId = inserted.id;

    // 2. Upload image if provided, store under notice id
    let image_url = null;
    if (imageFile) {
      const ext  = imageFile.name.split('.').pop().toLowerCase();
      // Store in a subfolder named after the notice id so RLS foldername() works
      const path = `${noticeId}/${noticeId}.${ext}`;
      console.log('[Notices] uploading image to path:', path);

      const { data: uploadData, error: uploadErr } = await supabase.storage
        .from('notice-images')
        .upload(path, imageFile, { upsert: true, contentType: imageFile.type });

      console.log('[Notices] upload result:', { uploadData, uploadErr });

      if (uploadErr) {
        console.error('[Notices] image upload failed:', uploadErr.message, uploadErr);
        alert(`Image upload failed: ${uploadErr.message}\n\nMake sure you have run the SQL setup for the notice-images bucket.`);
      } else {
        const { data: urlData } = supabase.storage
          .from('notice-images')
          .getPublicUrl(path);
        image_url = urlData?.publicUrl || null;
        console.log('[Notices] image public URL:', image_url);

        // 3. Update notice row with image_url
        const { error: updateErr } = await supabase
          .from('notices').update({ image_url }).eq('id', noticeId);
        if (updateErr) {
          console.error('[Notices] image_url update failed:', updateErr.message);
          alert(`Notice saved but image URL could not be stored: ${updateErr.message}\n\nMake sure you have run: ALTER TABLE public.notices ADD COLUMN image_url TEXT;`);
        }
      }
    }

    // 4. Push notifications
    try {
      let query = supabase
        .from('students')
        .select('auth_user_id')
        .eq('teacher_id', teacherId)
        .eq('is_paused', false)
        .not('auth_user_id', 'is', null);

      if (form.recipient_type === 'individual' && form.recipient_student_ids.length > 0) {
        query = query.in('id', form.recipient_student_ids);
      }

      const { data: targets } = await query;
      const userIds = [...new Set((targets || []).map(s => s.auth_user_id).filter(Boolean))];

      userIds.forEach(uid => {
        supabase.functions.invoke('send-push', {
          body: {
            user_id: uid,
            title: form.title,
            body: form.content.slice(0, 120),
            url: '/student/notices',
          },
        }).catch(err => console.warn('[Notices] push failed for', uid, err));
      });

      console.log(`[Notices] push dispatched to ${userIds.length} user(s)`);
    } catch (err) {
      console.warn('[Notices] push dispatch error:', err);
    }

    setSaving(false);
    onSaved();
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" onClick={e => e.stopPropagation()} style={{ maxHeight: '92dvh', overflowY: 'auto' }}>
        <div className="modal-handle" />
        <div className="modal-title">New Notice</div>

        <div className="field">
          <label className="field__label">Title *</label>
          <input className="field__input" value={form.title}
            onChange={e => setForm(p => ({...p, title: e.target.value}))}
            placeholder="Notice heading" />
        </div>

        <div className="field">
          <label className="field__label">Content *</label>
          <textarea className="field__input" rows={5} value={form.content}
            onChange={e => setForm(p => ({...p, content: e.target.value}))}
            placeholder="Write notice content..." style={{ resize: 'vertical' }} />
        </div>

        {/* Image attachment */}
        <div className="field">
          <label className="field__label">Attachment (optional image, max 5 MB)</label>
          {imagePreview ? (
            <div style={{ position: 'relative', borderRadius: 'var(--radius-md)', overflow: 'hidden', maxHeight: 200 }}>
              <img src={imagePreview} alt="preview"
                style={{ width: '100%', objectFit: 'cover', display: 'block', maxHeight: 200 }} />
              <button
                onClick={removeImage}
                style={{
                  position: 'absolute', top: 8, right: 8,
                  background: 'rgba(0,0,0,0.6)', border: 'none',
                  borderRadius: '50%', width: 30, height: 30,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', color: '#fff',
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>close</span>
              </button>
            </div>
          ) : (
            <button
              onClick={() => fileRef.current?.click()}
              style={{
                width: '100%', padding: 'var(--space-md)',
                border: '1.5px dashed var(--outline-variant)',
                borderRadius: 'var(--radius-md)', background: 'transparent',
                color: 'var(--on-surface-variant)', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                gap: 'var(--space-sm)', fontFamily: 'var(--font-body)', fontSize: '0.875rem',
              }}
            >
              <span className="material-symbols-outlined">add_photo_alternate</span>
              Attach an image
            </button>
          )}
          <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImagePick} />
        </div>

        {/* Recipients */}
        <div className="field">
          <label className="field__label">Recipients</label>
          <div className="tabs" style={{ marginBottom: 'var(--space-sm)' }}>
            {['all', 'group', 'individual'].map(type => (
              <button key={type}
                className={`tab-btn${form.recipient_type === type ? ' tab-btn--active' : ''}`}
                onClick={() => setForm(p => ({...p, recipient_type: type}))}>
                {type === 'all' ? 'All Students' : type === 'group' ? 'Group' : 'Individual'}
              </button>
            ))}
          </div>
          {form.recipient_type === 'group' && (
            <input className="field__input" placeholder="e.g. Class X, Science batch"
              value={form.recipient_group}
              onChange={e => setForm(p => ({...p, recipient_group: e.target.value}))} />
          )}
          {form.recipient_type === 'individual' && (
            <div className="card-list">
              {students.map(s => (
                <label key={s.id} className="card-item"
                  style={{ display: 'flex', alignItems: 'center', gap: '1rem', cursor: 'pointer' }}>
                  <input type="checkbox"
                    checked={form.recipient_student_ids.includes(s.id)}
                    onChange={e => setForm(p => ({
                      ...p,
                      recipient_student_ids: e.target.checked
                        ? [...p.recipient_student_ids, s.id]
                        : p.recipient_student_ids.filter(id => id !== s.id)
                    }))}
                  />
                  <span className="title-sm">{s.full_name}</span>
                </label>
              ))}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
          <button className="btn btn-tertiary" style={{ flex: 1 }} onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" style={{ flex: 2 }} onClick={handleSave} disabled={saving}>
            {saving ? <div className="spinner spinner--sm" /> : 'Broadcast Notice'}
          </button>
        </div>
      </div>
    </div>
  );
}
