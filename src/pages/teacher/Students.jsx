// src/pages/teacher/Students.jsx
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../supabase';
import { useAuth } from '../../context/AuthContext';
import TopBar from '../../components/shared/TopBar';
import BottomNav from '../../components/shared/BottomNav';

function getInitials(name = '') {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

function generateStudentId(name) {
  const clean = name.replace(/\s+/g, '').toUpperCase().slice(0, 6);
  const num = Math.floor(100 + Math.random() * 900);
  return `${clean}${num}`;
}

function generateUsername(name) {
  return name.replace(/\s+/g, '').toLowerCase().slice(0, 8) + Math.floor(10 + Math.random() * 90);
}

export default function TeacherStudents() {
  const { user } = useAuth();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editStudent, setEditStudent] = useState(null);
  const [search, setSearch] = useState('');
  const [filterPaused, setFilterPaused] = useState(false);

  const loadStudents = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from('students')
      .select('*')
      .eq('teacher_id', user.id)
      .order('full_name');
    setStudents(data || []);
    setLoading(false);
  }, [user]);

  useEffect(() => { loadStudents(); }, [loadStudents]);

  async function togglePause(student) {
    await supabase
      .from('students')
      .update({ is_paused: !student.is_paused })
      .eq('id', student.id);
    loadStudents();
  }

  async function deleteStudent(id) {
    if (!confirm('Delete this student? This will remove all their records.')) return;
    await supabase.from('students').delete().eq('id', id);
    loadStudents();
  }

  const filtered = students.filter(s => {
    const matchSearch = s.full_name.toLowerCase().includes(search.toLowerCase()) ||
      s.student_id.toLowerCase().includes(search.toLowerCase());
    const matchPaused = filterPaused ? s.is_paused : true;
    return matchSearch && matchPaused;
  });

  const activeCount = students.filter(s => !s.is_paused).length;
  const pausedCount = students.filter(s => s.is_paused).length;

  return (
    <div className="page-wrapper">
      <TopBar
        title="Students"
        backTo="/teacher"
        actions={
          <button className="btn btn-primary btn-sm" onClick={() => setShowAddModal(true)}>
            <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>person_add</span>
            Add
          </button>
        }
      />

      <main className="container" style={{ paddingTop: 'var(--space-lg)' }}>

        {/* Summary Row */}
        <div style={{ display: 'flex', gap: 'var(--space-sm)', marginBottom: 'var(--space-md)' }}>
          <div className="card" style={{ flex: 1, textAlign: 'center', background: 'var(--primary-fixed)' }}>
            <div className="headline-sm text-primary">{activeCount}</div>
            <div className="label-sm text-surface-variant">Active</div>
          </div>
          <div className="card" style={{ flex: 1, textAlign: 'center', background: 'var(--tertiary-fixed)' }}>
            <div className="headline-sm" style={{ color: 'var(--on-tertiary-fixed-variant)' }}>{pausedCount}</div>
            <div className="label-sm text-surface-variant">Paused</div>
          </div>
          <div className="card" style={{ flex: 1, textAlign: 'center', background: 'var(--surface-container-low)' }}>
            <div className="headline-sm text-primary">{students.length}</div>
            <div className="label-sm text-surface-variant">Total</div>
          </div>
        </div>

        {/* Search + filter */}
        <div className="field" style={{ marginBottom: 'var(--space-sm)' }}>
          <input
            className="field__input"
            placeholder="Search by name or ID..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', gap: 'var(--space-xs)', marginBottom: 'var(--space-md)' }}>
          <button
            className={`tab-btn${!filterPaused ? ' tab-btn--active' : ''}`}
            onClick={() => setFilterPaused(false)}
          >All</button>
          <button
            className={`tab-btn${filterPaused ? ' tab-btn--active' : ''}`}
            onClick={() => setFilterPaused(true)}
          >Paused</button>
        </div>

        {/* Student List */}
        {loading ? (
          <div className="card-list">
            {[1,2,3].map(i => (
              <div key={i} className="card-item" style={{ display: 'flex', gap: '1rem' }}>
                <div className="skeleton" style={{ width: 44, height: 44, borderRadius: '50%', flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div className="skeleton" style={{ width: '55%', height: 15, marginBottom: 6 }} />
                  <div className="skeleton" style={{ width: '35%', height: 12 }} />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <span className="material-symbols-outlined empty-state__icon">person_search</span>
            <div className="empty-state__title">No students found</div>
            <div className="empty-state__body">Add your first student to get started</div>
            <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>Add Student</button>
          </div>
        ) : (
          <div className="card-list">
            {filtered.map(student => (
              <div key={student.id} className="card-item" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
                <div className="student-avatar" style={{ opacity: student.is_paused ? 0.5 : 1 }}>
                  {getInitials(student.full_name)}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span className="title-sm">{student.full_name}</span>
                    {student.is_paused && <span className="chip chip-overdue">Paused</span>}
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: 2 }}>
                    <span className="student-id-badge">{student.student_id}</span>
                    {student.grade && <span className="label-sm text-surface-variant">{student.grade}</span>}
                    {student.monthly_fee > 0 && (
                      <span className="label-sm text-surface-variant">₹{student.monthly_fee?.toLocaleString('en-IN')}/mo</span>
                    )}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 'var(--space-xs)' }}>
                  <button
                    className="btn-icon top-bar__icon-btn"
                    onClick={() => setEditStudent(student)}
                    title="Edit"
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '1.125rem' }}>edit</span>
                  </button>
                  <button
                    className="btn-icon top-bar__icon-btn"
                    onClick={() => togglePause(student)}
                    title={student.is_paused ? 'Resume' : 'Pause'}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '1.125rem' }}>
                      {student.is_paused ? 'play_circle' : 'pause_circle'}
                    </span>
                  </button>
                  <button
                    className="btn-icon top-bar__icon-btn"
                    onClick={() => deleteStudent(student.id)}
                    title="Delete"
                    style={{ color: 'var(--error)' }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '1.125rem' }}>delete</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <BottomNav role="teacher" />

      {(showAddModal || editStudent) && (
        <StudentFormModal
          teacherId={user.id}
          student={editStudent}
          onClose={() => { setShowAddModal(false); setEditStudent(null); }}
          onSaved={() => { setShowAddModal(false); setEditStudent(null); loadStudents(); }}
        />
      )}
    </div>
  );
}

function StudentFormModal({ teacherId, student, onClose, onSaved }) {
  const isEdit = !!student;
  const [form, setForm] = useState({
    full_name: student?.full_name || '',
    username: student?.username || '',
    password: '',
    grade: student?.grade || '',
    phone: student?.phone || '',
    parent_name: student?.parent_name || '',
    parent_phone: student?.parent_phone || '',
    monthly_fee: student?.monthly_fee || '',
    fee_due_day: student?.fee_due_day || 5,
    advance_balance: student?.advance_balance || 0,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function handleChange(e) {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
    // Auto-generate username from name if creating new
    if (name === 'full_name' && !isEdit && !form.username) {
      setForm(prev => ({ ...prev, [name]: value, username: generateUsername(value) }));
    }
  }

  async function handleSubmit() {
    if (!form.full_name.trim()) { setError('Full name is required'); return; }
    if (!form.username.trim()) { setError('Username is required'); return; }
    if (!isEdit && !form.password) { setError('Password is required for new students'); return; }
    setSaving(true);
    setError('');
    try {
      if (isEdit) {
        const { error: err } = await supabase
          .from('students')
          .update({
            full_name: form.full_name.trim(),
            grade: form.grade,
            phone: form.phone,
            parent_name: form.parent_name,
            parent_phone: form.parent_phone,
            monthly_fee: parseFloat(form.monthly_fee) || 0,
            fee_due_day: parseInt(form.fee_due_day) || 5,
            advance_balance: parseFloat(form.advance_balance) || 0,
          })
          .eq('id', student.id);
        if (err) throw err;
      } else {
        // Create auth user via Edge Function, then insert student record
        const internalEmail = `${form.username.toLowerCase()}@tuition.internal`;
        const studentId = generateStudentId(form.full_name);

        // Call edge function to create auth user
        const { data: authData, error: authErr } = await supabase.functions.invoke('create-student-user', {
          body: {
            email: internalEmail,
            password: form.password,
            full_name: form.full_name.trim(),
            username: form.username.toLowerCase(),
          }
        });
        // supabase.functions.invoke only throws authErr for network/HTTP-transport failures.
        // When the edge function itself returns a 4xx JSON body with { error: "..." },
        // it lands in authData.error instead — so we must check both.
        if (authErr) {
          // Provide a helpful message when running locally with the wrong VITE_SUPABASE_URL
          const isNetworkErr =
            authErr.message?.toLowerCase().includes('failed to fetch') ||
            authErr.message?.toLowerCase().includes('networkerror') ||
            authErr.message?.toLowerCase().includes('edge function');
          if (isNetworkErr) {
            throw new Error(
              'Could not reach the edge function. ' +
              'If running locally, make sure VITE_SUPABASE_URL in .env.local is set to ' +
              'http://localhost:54321 and the function is running (supabase functions serve).'
            );
          }
          throw authErr;
        }
        if (authData?.error) {
          throw new Error(authData.error);
        }

        const { error: stuErr } = await supabase.from('students').insert({
          teacher_id: teacherId,
          auth_user_id: authData?.user_id,
          full_name: form.full_name.trim(),
          username: form.username.toLowerCase(),
          student_id: studentId,
          grade: form.grade,
          phone: form.phone,
          parent_name: form.parent_name,
          parent_phone: form.parent_phone,
          monthly_fee: parseFloat(form.monthly_fee) || 0,
          fee_due_day: parseInt(form.fee_due_day) || 5,
          advance_balance: parseFloat(form.advance_balance) || 0,
        });
        if (stuErr) throw stuErr;
      }
      onSaved();
    } catch (e) {
      setError(e.message || 'Something went wrong');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" onClick={e => e.stopPropagation()} style={{ maxHeight: '85dvh', overflowY: 'auto' }}>
        <div className="modal-handle" />
        <div className="modal-title">{isEdit ? 'Edit Student' : 'Add New Student'}</div>

        {error && (
          <div style={{ background: 'var(--error-container)', color: 'var(--on-error-container)', padding: '0.75rem', borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-md)', fontSize: '0.875rem' }}>
            {error}
          </div>
        )}

        <div className="field">
          <label className="field__label">Full Name *</label>
          <input className="field__input" name="full_name" value={form.full_name} onChange={handleChange} placeholder="e.g. Rohan Sharma" />
        </div>

        {!isEdit && (
          <>
            <div className="field">
              <label className="field__label">Username (for login) *</label>
              <input className="field__input" name="username" value={form.username} onChange={handleChange} placeholder="e.g. rohan123" />
            </div>
            <div className="field">
              <label className="field__label">Password *</label>
              <input className="field__input" type="password" name="password" value={form.password} onChange={handleChange} placeholder="Set a secure password" />
            </div>
          </>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-sm)' }}>
          <div className="field">
            <label className="field__label">Grade / Class</label>
            <input className="field__input" name="grade" value={form.grade} onChange={handleChange} placeholder="e.g. Class X" />
          </div>
          <div className="field">
            <label className="field__label">Monthly Fee (₹)</label>
            <input className="field__input" type="number" name="monthly_fee" value={form.monthly_fee} onChange={handleChange} placeholder="3000" />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-sm)' }}>
          <div className="field">
            <label className="field__label">Fee Due Day</label>
            <input className="field__input" type="number" name="fee_due_day" min="1" max="28" value={form.fee_due_day} onChange={handleChange} />
          </div>
          <div className="field">
            <label className="field__label">Advance Balance (₹)</label>
            <input className="field__input" type="number" name="advance_balance" value={form.advance_balance} onChange={handleChange} placeholder="0" />
          </div>
        </div>

        <div className="field">
          <label className="field__label">Parent Name</label>
          <input className="field__input" name="parent_name" value={form.parent_name} onChange={handleChange} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-sm)' }}>
          <div className="field">
            <label className="field__label">Student Phone</label>
            <input className="field__input" name="phone" value={form.phone} onChange={handleChange} />
          </div>
          <div className="field">
            <label className="field__label">Parent Phone</label>
            <input className="field__input" name="parent_phone" value={form.parent_phone} onChange={handleChange} />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 'var(--space-sm)', marginTop: 'var(--space-sm)' }}>
          <button className="btn btn-tertiary" style={{ flex: 1 }} onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" style={{ flex: 2 }} onClick={handleSubmit} disabled={saving}>
            {saving ? <div className="spinner spinner--sm" /> : (isEdit ? 'Save Changes' : 'Create Student')}
          </button>
        </div>
      </div>
    </div>
  );
}
