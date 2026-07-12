'use client';

import { useState } from 'react';
import { Lock, X } from 'lucide-react';
import { PasswordConfirmationFields } from './PasswordConfirmationFields';

export function SetPasswordModal({ open, onClose, onSaved, resetToken = '' }) {
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  if (!open) return null;

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    const formData = new FormData(event.currentTarget);
    const password = String(formData.get('password') || '');
    const confirmPassword = String(formData.get('confirmPassword') || '');
    setSaving(true);

    const response = await fetch('/api/auth/set-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password, confirmPassword, resetToken }),
    });
    const payload = await response.json().catch(() => ({}));
    setSaving(false);

    if (!response.ok) {
      setError(payload.error || 'Password could not be saved.');
      return;
    }

    onSaved?.();
  }

  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center bg-black/80 px-4 py-8"
      role="dialog"
      aria-modal="true"
      aria-labelledby="set-password-title"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose?.();
      }}
    >
      <div className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 id="set-password-title" className="text-2xl font-semibold text-slate-950">{resetToken ? 'Reset password' : 'Set password'}</h1>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              {resetToken ? 'Enter a new password for this account.' : 'Add a password so this account no longer relies on the temporary test login.'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-950"
            aria-label="Close set password dialog"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {error ? <p className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <PasswordConfirmationFields />
          <button
            type="submit"
            disabled={saving}
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md bg-slate-900 px-4 py-2 font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
          >
            <Lock className="h-4 w-4" />
            {saving ? 'Saving...' : 'Save password'}
          </button>
        </form>
      </div>
    </div>
  );
}
