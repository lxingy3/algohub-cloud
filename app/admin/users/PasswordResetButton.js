'use client';

import { useState } from 'react';

export function PasswordResetButton({ userId, disabled = false }) {
  const [resetUrl, setResetUrl] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  async function createResetLink() {
    setError('');
    setCopied(false);
    setLoading(true);
    const response = await fetch(`/api/admin/users/${userId}/password-reset`, { method: 'POST' });
    const payload = await response.json().catch(() => ({}));
    setLoading(false);
    if (!response.ok) {
      setError(payload.error || 'Could not create reset link.');
      return;
    }
    setResetUrl(payload.resetUrl || '');
    setExpiresAt(payload.expiresAt || '');
  }

  async function copyLink() {
    if (!resetUrl) return;
    await navigator.clipboard.writeText(resetUrl);
    setCopied(true);
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={createResetLink}
        disabled={disabled || loading}
        className="min-h-10 rounded-md border px-3 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? 'Creating...' : 'Reset'}
      </button>
      {error ? <p className="max-w-xs text-xs leading-5 text-red-600">{error}</p> : null}
      {resetUrl ? (
        <div className="max-w-xs rounded-md border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-slate-700">
          <p className="font-semibold text-slate-900">Password reset link</p>
          <p className="mt-1 break-all">{resetUrl}</p>
          <p className="mt-1 text-slate-500">Expires {formatDateTime(expiresAt)}</p>
          <button type="button" onClick={copyLink} className="mt-2 rounded-md bg-slate-900 px-3 py-1.5 font-semibold text-white hover:bg-slate-800">
            {copied ? 'Copied' : 'Copy link'}
          </button>
        </div>
      ) : null}
    </div>
  );
}

function formatDateTime(value) {
  if (!value) return 'soon';
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));
}
