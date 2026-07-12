'use client';

import { LogOut, Pencil, X } from 'lucide-react';
import { useEffect, useState } from 'react';

export function EditUserButton({ user, organizations }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (event) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open]);

  async function save(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    const formData = new FormData(event.currentTarget);
    formData.set('action', 'update-profile');
    const response = await fetch(`/api/admin/users/${user.id}/manage`, { method: 'POST', body: formData });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      setSaving(false);
      setError(result.error || 'User details could not be saved.');
      return;
    }
    window.location.reload();
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50">
        <Pencil className="h-4 w-4" /> Edit profile
      </button>
      {open ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 px-4" role="dialog" aria-modal="true" aria-labelledby={`edit-user-${user.id}`} onMouseDown={(event) => {
          if (event.target === event.currentTarget) setOpen(false);
        }}>
          <form onSubmit={save} className="w-full max-w-md rounded-lg bg-white p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <h2 id={`edit-user-${user.id}`} className="text-xl font-bold text-slate-950">Edit user profile</h2>
              <button type="button" onClick={() => setOpen(false)} className="inline-flex h-10 w-10 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100" aria-label="Close user editor"><X className="h-5 w-5" /></button>
            </div>
            <label className="mt-5 block text-sm font-semibold text-slate-700">
              Name
              <input name="name" defaultValue={user.name} minLength={2} maxLength={255} required className="mt-1 min-h-11 w-full rounded-md border px-3 py-2" />
            </label>
            <label className="mt-4 block text-sm font-semibold text-slate-700">
              Organization
              <select name="organizationId" defaultValue={user.organizationId || ''} className="mt-1 min-h-11 w-full rounded-md border bg-white px-3 py-2">
                <option value="">No organization</option>
                {organizations.map((organization) => <option key={organization.id} value={organization.id}>{organization.name}</option>)}
              </select>
            </label>
            {error ? <p className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setOpen(false)} className="min-h-11 rounded-md border px-4 py-2 text-sm font-semibold">Cancel</button>
              <button disabled={saving} className="min-h-11 rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">{saving ? 'Saving...' : 'Save profile'}</button>
            </div>
          </form>
        </div>
      ) : null}
    </>
  );
}

export function SignOutUserButton({ userId, disabled, sessionCount, preserveCurrent = false }) {
  const [status, setStatus] = useState('');
  const targetCount = Math.max(0, sessionCount - (preserveCurrent ? 1 : 0));

  async function signOut() {
    if (!window.confirm(`Sign this user out of ${targetCount} active session${targetCount === 1 ? '' : 's'}?`)) return;
    setStatus('Signing out...');
    const formData = new FormData();
    formData.set('action', 'sign-out');
    const response = await fetch(`/api/admin/users/${userId}/manage`, { method: 'POST', body: formData });
    setStatus(response.ok ? 'Signed out' : 'Could not sign out');
  }

  return (
    <button type="button" onClick={signOut} disabled={disabled || status === 'Signing out...'} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50" title={disabled ? 'No other active sessions to close.' : undefined}>
      <LogOut className="h-4 w-4" /> {status || `${preserveCurrent ? 'Sign out others' : 'Sign out'} (${targetCount})`}
    </button>
  );
}
