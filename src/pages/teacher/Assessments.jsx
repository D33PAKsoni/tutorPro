// src/pages/teacher/Assessments.jsx
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../supabase';
import { useAuth } from '../../context/AuthContext';
import TopBar from '../../components/shared/TopBar';
import BottomNav from '../../components/shared/BottomNav';
import { format } from 'date-fns';

export default function TeacherAssessments() {
  const { user } = useAuth();
  const [assessments, setAssessments] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const [aRes, sRes] = await Promise.all([
      supabase.from('assessments').select('*, students(full_name, student_id)').eq('teacher_id', user.id).order('assessment_date', { ascending: false }),
      supabase.from('students').select('id, full_name, student_id').eq('teacher_id', user.id).eq('is_paused', false).order('full_name'),
    ]);
    setAssessments(aRes.data || []);
    setStudents(sRes.data || []);
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  async function deleteAssessment(id) {
    if (!confirm('Delete this assessment record?')) return;
    await supabase.from('assessments').delete().eq('id', id);
    load();
  }

  const pct = (score, max) => max > 0 ? Math.round((score / max) * 100) : 0;
  const grade = (p) => p >= 90 ? 'A+' : p >= 75 ? 'A' : p >= 60 ? 'B' : p >= 45 ? 'C' : 'D';

  return (
    <div className="page-wrapper">
      <TopBar
        title="Assessments"
        backTo="/teacher"
        actions={
          <button className="btn btn-primary btn-sm" onClick={() => { setEditItem(null); setShowModal(true); }}>
            <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>add</span>
            Add
          </button>
        }
      />
      <main className="container" style={{ paddingTop: 'var(--space-lg)' }}>
        {loading ? (
          <div className="card-list">
            {[1,2,3].map(i => <div key={i} className="card-item skeleton" style={{ height: 72 }} />)}
          </div>
        ) : assessments.length === 0 ? (
          <div className="empty-state">
            <span className="material-symbols-outlined empty-state__icon">assignment</span>
            <div className="empty-state__title">No assessments recorded</div>
            <button className="btn btn-primary" onClick={() => setShowModal(true)}>Add Assessment</button>
          </div>
        ) : (
          <div className="card-list">
            {assessments.map(a => {
              const p = pct(a.score, a.max_marks);
              return (
                <div key={a.id} className="card-item" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
                  <div style={{
                    width: 48, height: 48, borderRadius: 'var(--radius-md)', flexShrink: 0,
                    background: p >= 75 ? 'var(--primary-fixed)' : p >= 45 ? 'var(--secondary-fixed)' : 'var(--tertiary-fixed)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexDirection: 'column',
                  }}>
                    <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1rem', color: 'var(--primary)', lineHeight: 1 }}>
                      {grade(p)}
                    </span>
                    <span className="label-sm text-surface-variant">{p}%</span>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div className="title-sm">{a.students?.full_name}</div>
                    <div className="label-sm text-surface-variant">{a.subject} · {format(new Date(a.assessment_date), 'dd MMM yyyy')}</div>
                    <div className="body-sm text-surface-variant">{a.score}/{a.max_marks} marks</div>
                  </div>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button className="top-bar__icon-btn" onClick={() => { setEditItem(a); setShowModal(true); }}>
                      <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>edit</span>
                    </button>
                    <button className="top-bar__icon-btn" onClick={() => deleteAssessment(a.id)} style={{ color: 'var(--error)' }}>
                      <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>delete</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
      <BottomNav role="teacher" />
      {showModal && (
        <AssessmentModal
          teacherId={user.id}
          students={students}
          item={editItem}
          onClose={() => setShowModal(false)}
          onSaved={() => { setShowModal(false); load(); }}
        />
      )}
    </div>
  );
}

function AssessmentModal({ teacherId, students, item, onClose, onSaved }) {
  const [form, setForm] = useState({
    student_id: item?.student_id || '',
    subject: item?.subject || '',
    assessment_date: item?.assessment_date || format(new Date(), 'yyyy-MM-dd'),
    title: item?.title || '',
    score: item?.score || '',
    max_marks: item?.max_marks || 100,
    teacher_remark: item?.teacher_remark || '',
  });
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!form.student_id || !form.subject || form.score === '') return;
    setSaving(true);
    if (item) {
      await supabase.from('assessments').update({ ...form, score: +form.score, max_marks: +form.max_marks, teacher_id: teacherId }).eq('id', item.id);
    } else {
      await supabase.from('assessments').insert({ ...form, score: +form.score, max_marks: +form.max_marks, teacher_id: teacherId });
    }
    setSaving(false);
    onSaved();
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" onClick={e => e.stopPropagation()}>
        <div className="modal-handle" />
        <div className="modal-title">{item ? 'Edit' : 'Add'} Assessment</div>
        <div className="field">
          <label className="field__label">Student *</label>
          <select className="field__input field__select" value={form.student_id} onChange={e => setForm(p => ({...p, student_id: e.target.value}))}>
            <option value="">Select student</option>
            {students.map(s => <option key={s.id} value={s.id}>{s.full_name}</option>)}
          </select>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-sm)' }}>
          <div className="field">
            <label className="field__label">Subject *</label>
            <input className="field__input" value={form.subject} onChange={e => setForm(p => ({...p, subject: e.target.value}))} placeholder="e.g. Mathematics" />
          </div>
          <div className="field">
            <label className="field__label">Date</label>
            <input className="field__input" type="date" value={form.assessment_date} onChange={e => setForm(p => ({...p, assessment_date: e.target.value}))} />
          </div>
        </div>
        <div className="field">
          <label className="field__label">Test / Assessment Title</label>
          <input className="field__input" value={form.title} onChange={e => setForm(p => ({...p, title: e.target.value}))} placeholder="e.g. Unit Test 2" />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-sm)' }}>
          <div className="field">
            <label className="field__label">Score *</label>
            <input className="field__input" type="number" value={form.score} onChange={e => setForm(p => ({...p, score: e.target.value}))} />
          </div>
          <div className="field">
            <label className="field__label">Max Marks</label>
            <input className="field__input" type="number" value={form.max_marks} onChange={e => setForm(p => ({...p, max_marks: e.target.value}))} />
          </div>
        </div>
        <div className="field">
          <label className="field__label">Teacher Remarks</label>
          <textarea className="field__input" rows={3} value={form.teacher_remark} onChange={e => setForm(p => ({...p, teacher_remark: e.target.value}))} placeholder="Optional feedback..." style={{ resize: 'vertical' }} />
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
          <button className="btn btn-tertiary" style={{ flex: 1 }} onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" style={{ flex: 2 }} onClick={handleSave} disabled={saving}>
            {saving ? <div className="spinner spinner--sm" /> : (item ? 'Update' : 'Save')}
          </button>
        </div>
      </div>
    </div>
  );
}
