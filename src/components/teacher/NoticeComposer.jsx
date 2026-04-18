// src/components/teacher/NoticeComposer.jsx
// Bottom-sheet modal for composing and broadcasting a notice.
// Supports All / Group / Individual recipient types.
// Used in both the Notices page and quick-action on Dashboard.

import { useState } from 'react';
import { supabase } from '../../supabase';

/**
 * NoticeComposer
 * @param {string}   teacherId     - Auth UID of the teacher
 * @param {array}    students      - All active students [{id, full_name}]
 * @param {function} onClose       - () => void
 * @param {function} onSaved       - () => void — called after successful save
 */
export default function NoticeComposer({ teacherId, students = [], onClose, onSaved }) {
  const [form, setForm] = useState({
    title: '',
    content: '',
    recipient_type: 'all',
    recipient_student_ids: [],
    recipient_group: '',
    is_pinned: false,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function set(key, val) {
    setForm(prev => ({ ...prev, [key]: val }));
  }

  function toggleStudent(id) {
    setForm(prev => ({
      ...prev,
      recipient_student_ids: prev.recipient_student_ids.includes(id)
        ? prev.recipient_student_ids.filter(x => x !== id)
        : [...prev.recipient_student_ids, id],
    }));
  }

  async function handleSave() {
    if (!form.title.trim()) { setError('Title is required'); return; }
    if (!form.content.trim()) { setError('Content is required'); return; }
    if (form.recipient_type === 'individual' && form.recipient_student_ids.length === 0) {
      setError('Select at least one student'); return;
    }
    setSaving(true);
    setError('');
    const { error: err } = await supabase.from('notices').insert({
      teacher_id: teacherId,
      title: form.title.trim(),
      content: form.content.trim(),
      recipient_type: form.recipient_type,
      recipient_student_ids: form.recipient_type === 'individual' ? form.recipient_student_ids : [],
      recipient_group: form.recipient_type === 'group' ? form.recipient_group.trim() : null,
      is_pinned: form.is_pinned,
    });
    setSaving(false);
    if (err) { setError(err.message); return; }
    onSaved?.();
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-sheet"
        onClick={e => e.stopPropagation()}
        style={{ maxHeight: '88dvh', overflowY: 'auto' }}
      >
        <div className="modal-handle" />
        <div className="modal-title">New Notice</div>

        {error && (
          <div style={{
            background: 'var(--error-container)',
            color: 'var(--on-error-container)',
            padding: '0.75rem',
            borderRadius: 'var(--radius-md)',
            marginBottom: 'var(--space-md)',
            fontSize: '0.875rem',
          }}>
            {error}
          </div>
        )}

        {/* Title */}
        <div className="field">
          <label className="field__label">Title *</label>
          <input
            className="field__input"
            value={form.title}
            onChange={e => set('title', e.target.value)}
            placeholder="e.g. Class rescheduled to Monday"
            maxLength={120}
          />
        </div>

        {/* Content */}
        <div className="field">
          <label className="field__label">Content *</label>
          <textarea
            className="field__input"
            value={form.content}
            onChange={e => set('content', e.target.value)}
            placeholder="Write notice content here..."
            rows={4}
            style={{ resize: 'vertical', minHeight: 80 }}
          />
        </div>

        {/* Recipients */}
        <div className="field">
          <label className="field__label">Send to</label>
          <div className="tabs" style={{ marginBottom: 'var(--space-sm)' }}>
            {[
              { value: 'all',        label: 'All Students' },
              { value: 'group',      label: 'Group' },
              { value: 'individual', label: 'Individual' },
            ].map(opt => (
              <button
                key={opt.value}
                className={`tab-btn${form.recipient_type === opt.value ? ' tab-btn--active' : ''}`}
                onClick={() => set('recipient_type', opt.value)}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {form.recipient_type === 'group' && (
            <input
              className="field__input"
              placeholder="e.g. Class X, Science batch"
              value={form.recipient_group}
              onChange={e => set('recipient_group', e.target.value)}
            />
          )}

          {form.recipient_type === 'individual' && (
            <div
              style={{
                background: 'var(--surface-container-low)',
                borderRadius: 'var(--radius-md)',
                padding: 'var(--space-sm)',
                maxHeight: 200,
                overflowY: 'auto',
              }}
            >
              {students.length === 0 ? (
                <div className="label-sm text-surface-variant" style={{ padding: 'var(--space-sm)' }}>
                  No active students
                </div>
              ) : (
                students.map(s => (
                  <label
                    key={s.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 'var(--space-sm)',
                      padding: '0.5rem',
                      cursor: 'pointer',
                      borderRadius: 'var(--radius-sm)',
                      background: form.recipient_student_ids.includes(s.id)
                        ? 'var(--primary-fixed)' : 'transparent',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={form.recipient_student_ids.includes(s.id)}
                      onChange={() => toggleStudent(s.id)}
                      style={{ accentColor: 'var(--primary)' }}
                    />
                    <span className="title-sm">{s.full_name}</span>
                  </label>
                ))
              )}
            </div>
          )}
        </div>

        {/* Pin option */}
        <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', cursor: 'pointer', marginBottom: 'var(--space-md)' }}>
          <input
            type="checkbox"
            checked={form.is_pinned}
            onChange={e => set('is_pinned', e.target.checked)}
            style={{ accentColor: 'var(--primary)', width: 16, height: 16 }}
          />
          <span className="label-md">Pin this notice to the top</span>
        </label>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
          <button className="btn btn-tertiary" style={{ flex: 1 }} onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn btn-primary"
            style={{ flex: 2 }}
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? <div className="spinner spinner--sm" /> : (
              <>
                <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>campaign</span>
                Broadcast
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
