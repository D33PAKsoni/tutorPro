// src/components/teacher/NoticeComposer.jsx
// Bottom-sheet modal for composing and broadcasting notices

import { useState } from 'react';
import { supabase } from '../../supabase';

/**
 * Props:
 *  - teacherId: string
 *  - students: array of { id, full_name } for individual recipient selection
 *  - onClose(): called when modal should be dismissed
 *  - onSaved(): called after successful save
 */
export default function NoticeComposer({ teacherId, students = [], onClose, onSaved }) {
  const [form, setForm] = useState({
    title: '',
    content: '',
    recipient_type: 'all',
    recipient_student_ids: [],
    recipient_group: '',
  });
  const [saving, setSaving] = useState(false);

  function set(key, value) {
    setForm(prev => ({ ...prev, [key]: value }));
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
    if (!form.title.trim() || !form.content.trim()) return;
    setSaving(true);
    await supabase.from('notices').insert({ ...form, teacher_id: teacherId });
    setSaving(false);
    onSaved?.();
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" onClick={e => e.stopPropagation()}>
        <div className="modal-handle" />
        <div className="modal-title">New Notice</div>

        <div className="field">
          <label className="field__label">Title *</label>
          <input
            className="field__input"
            value={form.title}
            onChange={e => set('title', e.target.value)}
            placeholder="Notice heading"
          />
        </div>

        <div className="field">
          <label className="field__label">Content *</label>
          <textarea
            className="field__input"
            rows={5}
            value={form.content}
            onChange={e => set('content', e.target.value)}
            placeholder="Write notice content..."
            style={{ resize: 'vertical' }}
          />
        </div>

        <div className="field">
          <label className="field__label">Recipients</label>
          <div className="tabs" style={{ marginBottom: 'var(--space-sm)' }}>
            {['all', 'group', 'individual'].map(type => (
              <button
                key={type}
                className={`tab-btn${form.recipient_type === type ? ' tab-btn--active' : ''}`}
                onClick={() => set('recipient_type', type)}
              >
                {type === 'all' ? 'All Students' : type === 'group' ? 'Group' : 'Individual'}
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
            <div className="card-list">
              {students.map(s => (
                <label
                  key={s.id}
                  className="card-item"
                  style={{ display: 'flex', alignItems: 'center', gap: '1rem', cursor: 'pointer' }}
                >
                  <input
                    type="checkbox"
                    checked={form.recipient_student_ids.includes(s.id)}
                    onChange={() => toggleStudent(s.id)}
                  />
                  <span className="title-sm">{s.full_name}</span>
                </label>
              ))}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
          <button className="btn btn-tertiary" style={{ flex: 1 }} onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-primary" style={{ flex: 2 }} onClick={handleSave} disabled={saving}>
            {saving ? <div className="spinner spinner--sm" /> : 'Broadcast Notice'}
          </button>
        </div>
      </div>
    </div>
  );
}
