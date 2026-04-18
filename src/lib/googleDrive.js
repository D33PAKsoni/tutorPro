// src/lib/googleDrive.js
import { supabase } from '../supabase';

const REDIRECT_URI = `${window.location.origin}/auth/google/callback`;

export function initiateGoogleOAuth() {
  const params = new URLSearchParams({
    client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: 'code',
    scope: import.meta.env.VITE_GOOGLE_DRIVE_SCOPE,
    access_type: 'offline',
    prompt: 'consent',
  });
  window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}

export async function handleGoogleCallback(code) {
  const { data, error } = await supabase.functions.invoke('exchange-google-token', {
    body: { code, redirect_uri: REDIRECT_URI },
  });
  if (error) throw new Error(error.message);
  return data;
}

export async function backupToDrive(supabaseClient, userId) {
  const [students, attendance, fees, assessments, notices] = await Promise.all([
    supabaseClient.from('students').select('*'),
    supabaseClient.from('attendance').select('*'),
    supabaseClient.from('fees').select('*'),
    supabaseClient.from('assessments').select('*'),
    supabaseClient.from('notices').select('*'),
  ]);

  const backup = {
    exported_at: new Date().toISOString(),
    version: '1.0',
    teacher_id: userId,
    students: students.data || [],
    attendance: attendance.data || [],
    fees: fees.data || [],
    assessments: assessments.data || [],
    notices: notices.data || [],
  };

  const { data: profile } = await supabaseClient
    .from('profiles').select('google_drive_token').eq('id', userId).single();

  const token = profile?.google_drive_token?.access_token;
  if (!token) throw new Error('Google Drive not linked. Go to Settings to connect.');

  const fileName = `tuition-pro-backup-${new Date().toISOString().slice(0, 7)}.json`;
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
  const metadata = { name: fileName, mimeType: 'application/json' };

  const form = new FormData();
  form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
  form.append('file', blob);

  const res = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
    { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: form }
  );
  if (!res.ok) throw new Error('Drive upload failed: ' + res.statusText);
  return res.json();
}


// src/lib/backup.js — Local JSON export/import
export async function exportLocalBackup(supabaseClient) {
  const [students, attendance, fees, assessments, notices] = await Promise.all([
    supabaseClient.from('students').select('*'),
    supabaseClient.from('attendance').select('*'),
    supabaseClient.from('fees').select('*'),
    supabaseClient.from('assessments').select('*'),
    supabaseClient.from('notices').select('*'),
  ]);

  const backup = {
    exported_at: new Date().toISOString(),
    version: '1.0',
    students: students.data || [],
    attendance: attendance.data || [],
    fees: fees.data || [],
    assessments: assessments.data || [],
    notices: notices.data || [],
  };

  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `tuition-pro-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function importLocalBackup(supabaseClient, file, teacherId) {
  const text = await file.text();
  let data;
  try { data = JSON.parse(text); } catch { throw new Error('Invalid backup file format'); }
  if (!data.version || !data.students) throw new Error('Unrecognised backup format');

  // Re-insert with the current teacher_id
  const students = (data.students || []).map(s => ({ ...s, teacher_id: teacherId }));
  const attendance = (data.attendance || []).map(a => ({ ...a, teacher_id: teacherId }));
  const fees = (data.fees || []).map(f => ({ ...f, teacher_id: teacherId }));
  const assessments = (data.assessments || []).map(a => ({ ...a, teacher_id: teacherId }));
  const notices = (data.notices || []).map(n => ({ ...n, teacher_id: teacherId }));

  await supabaseClient.from('students').upsert(students, { onConflict: 'student_id' });
  await supabaseClient.from('attendance').upsert(attendance, { onConflict: 'teacher_id,student_id,date' });
  await supabaseClient.from('fees').upsert(fees, { onConflict: 'teacher_id,student_id,month' });
  await supabaseClient.from('assessments').upsert(assessments);
  await supabaseClient.from('notices').upsert(notices);

  return { students: students.length, attendance: attendance.length };
}
