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
  const [siblingStudent, setSiblingStudent] = useState(null); // student to manage siblings for
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
          <div className="card" style={{ flex: 1, textAlign: 'center',scrollBehavior: 'smooth' , background: 'var(--primary-fixed)' }}>
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
              <div key={student.id} className="card-item" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
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
                    onClick={() => setSiblingStudent(student)}
                    title="Link siblings"
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '1.125rem' }}>group</span>
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

      {siblingStudent && (
        <SiblingLinkModal
          student={siblingStudent}
          allStudents={students}
          teacherId={user.id}
          onClose={() => setSiblingStudent(null)}
        />
      )}

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
          },
        });
        // functions.invoke wraps HTTP errors: authErr = network/CORS failure;
        // authData.error = the JSON error body the function returned
        if (authErr) {
          throw new Error(authErr.message || 'Could not reach the edge function. Check that create-student-user is deployed (supabase functions deploy create-student-user).');
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

// ── SiblingLinkModal ─────────────────────────────────────────────────────────
// Lets a teacher link/unlink siblings so they can switch accounts without re-login.
// Creates/removes rows in trust_records. Works both ways: if A is linked to B,
// B can also switch to A (bidirectional).

function SiblingLinkModal({ student, allStudents, teacherId, onClose }) {
  const [linked, setLinked] = useState([]);       // current trust_records for this student
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(null);     // id of student being toggled

  // Students that could be siblings: same teacher, different student, not self
  const candidates = allStudents.filter(s => s.id !== student.id);
  // Highlight suggested ones (same parent_name, non-empty)
  const suggested = candidates.filter(
    s => student.parent_name &&
         s.parent_name?.toLowerCase().trim() === student.parent_name?.toLowerCase().trim()
  );

  useEffect(() => {
    loadLinked();
  }, [student.id]);

  async function loadLinked() {
    setLoading(true);
    // Fetch trust records in BOTH directions
    const { data: asMain } = await supabase
      .from('trust_records')
      .select('student_id')
      .eq('auth_profile_id', student.auth_user_id)
      .eq('granted_by_teacher_id', teacherId);

    const { data: asSibling } = await supabase
      .from('trust_records')
      .select('auth_profile_id')
      .eq('student_id', student.id)
      .eq('granted_by_teacher_id', teacherId);

    // Collect all student IDs linked to this student
    const ids = new Set([
      ...(asMain || []).map(r => r.student_id),
      // For asSibling rows, we need the student whose auth_user_id = auth_profile_id
    ]);

    // Resolve asSibling auth_profile_ids to student ids
    const siblingAuthIds = (asSibling || []).map(r => r.auth_profile_id);
    if (siblingAuthIds.length > 0) {
      const { data: sibStudents } = await supabase
        .from('students')
        .select('id')
        .in('auth_user_id', siblingAuthIds);
      (sibStudents || []).forEach(s => ids.add(s.id));
    }

    setLinked([...ids]);
    setLoading(false);
  }

  async function toggleLink(sibling) {
    if (!student.auth_user_id) {
      alert('This student has no login account yet. Create a login for them first.');
      return;
    }
    if (!sibling.auth_user_id) {
      alert(`${sibling.full_name} has no login account yet. Create a login for them first.`);
      return;
    }

    setSaving(sibling.id);
    const isLinked = linked.includes(sibling.id);

    if (isLinked) {
      // Remove both directions
      await supabase.from('trust_records').delete()
        .eq('auth_profile_id', student.auth_user_id)
        .eq('student_id', sibling.id)
        .eq('granted_by_teacher_id', teacherId);
      await supabase.from('trust_records').delete()
        .eq('auth_profile_id', sibling.auth_user_id)
        .eq('student_id', student.id)
        .eq('granted_by_teacher_id', teacherId);
    } else {
      // Add both directions so either sibling can switch to the other
      await supabase.from('trust_records').upsert([
        { auth_profile_id: student.auth_user_id, student_id: sibling.id, granted_by_teacher_id: teacherId },
        { auth_profile_id: sibling.auth_user_id, student_id: student.id, granted_by_teacher_id: teacherId },
      ], { onConflict: 'auth_profile_id,student_id' });
    }

    await loadLinked();
    setSaving(null);
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" onClick={e => e.stopPropagation()} style={{ maxHeight: '85dvh', overflowY: 'auto' }}>
        <div className="modal-handle" />
        <div className="modal-title">Sibling Links — {student.full_name}</div>

        <div style={{ fontSize: '0.8125rem', color: 'var(--on-surface-variant)', marginBottom: 'var(--space-md)', lineHeight: 1.5 }}>
          Link siblings so they can switch between accounts without re-logging in.
          Links are <strong>bidirectional</strong> — both students get access to each other.
        </div>

        {!student.auth_user_id && (
          <div style={{ background: 'var(--error-container)', color: 'var(--on-error-container)', padding: '0.75rem', borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-md)', fontSize: '0.8125rem' }}>
            ⚠️ This student has no login account. They cannot be linked until a login is created.
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: 'center', padding: '2rem' }}><div className="spinner" /></div>
        ) : (
          <>
            {suggested.length > 0 && (
              <>
                <div className="section-header" style={{ marginBottom: 'var(--space-sm)' }}>
                  <span className="section-title">⭐ Suggested (same parent name)</span>
                </div>
                <div className="card-list" style={{ marginBottom: 'var(--space-md)' }}>
                  {suggested.map(s => (
                    <SiblingRow
                      key={s.id} sibling={s}
                      isLinked={linked.includes(s.id)}
                      isSaving={saving === s.id}
                      onToggle={() => toggleLink(s)}
                    />
                  ))}
                </div>
              </>
            )}

            {candidates.filter(s => !suggested.find(sg => sg.id === s.id)).length > 0 && (
              <>
                <div className="section-header" style={{ marginBottom: 'var(--space-sm)' }}>
                  <span className="section-title">All Other Students</span>
                </div>
                <div className="card-list">
                  {candidates
                    .filter(s => !suggested.find(sg => sg.id === s.id))
                    .map(s => (
                      <SiblingRow
                        key={s.id} sibling={s}
                        isLinked={linked.includes(s.id)}
                        isSaving={saving === s.id}
                        onToggle={() => toggleLink(s)}
                      />
                    ))}
                </div>
              </>
            )}

            {candidates.length === 0 && (
              <div className="empty-state">
                <span className="material-symbols-outlined empty-state__icon">group_off</span>
                <div className="empty-state__title">No other students</div>
                <div className="empty-state__body">Add more students to create sibling links</div>
              </div>
            )}
          </>
        )}

        <button className="btn btn-tertiary" style={{ width: '100%', marginTop: 'var(--space-md)' }} onClick={onClose}>
          Done
        </button>
      </div>
    </div>
  );
}

function SiblingRow({ sibling, isLinked, isSaving, onToggle }) {
  return (
    <div className="card-item" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
      <div className="student-avatar" style={{ opacity: sibling.is_paused ? 0.5 : 1, flexShrink: 0 }}>
        {sibling.full_name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0,2)}
      </div>
      <div style={{ flex: 1 }}>
        <div className="title-sm">{sibling.full_name}</div>
        <div style={{ display: 'flex', gap: '0.5rem', marginTop: 2, flexWrap: 'wrap' }}>
          <span className="student-id-badge">{sibling.student_id}</span>
          {sibling.parent_name && (
            <span className="label-sm text-surface-variant">Parent: {sibling.parent_name}</span>
          )}
          {!sibling.auth_user_id && (
            <span className="label-sm" style={{ color: 'var(--tertiary)' }}>No login</span>
          )}
        </div>
      </div>
      <button
        onClick={onToggle}
        disabled={isSaving}
        style={{
          padding: '0.4rem 0.9rem',
          borderRadius: 'var(--radius-md)',
          border: isLinked ? '1px solid var(--error)' : '1px solid var(--primary)',
          background: isLinked ? 'var(--error-container)' : 'var(--primary-fixed)',
          color: isLinked ? 'var(--on-error-container)' : 'var(--on-primary-fixed)',
          fontFamily: 'var(--font-body)', fontSize: '0.8125rem', fontWeight: 600,
          cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem',
          flexShrink: 0,
        }}
      >
        {isSaving ? (
          <div className="spinner spinner--sm" />
        ) : isLinked ? (
          <><span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>link_off</span>Unlink</>
        ) : (
          <><span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>link</span>Link</>
        )}
      </button>
    </div>
  );
}
