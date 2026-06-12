'use client';

import Link from 'next/link';
import { useEffect, useId, useState } from 'react';
import { signIn } from 'next-auth/react';
import { useTranslation } from 'react-i18next';
import { Github, Mail, X } from 'lucide-react';

const roles = ['ADMIN', 'COMMUNITY_MEMBER', 'FACILITATOR', 'ORG_MEMBER', 'RESEARCHER'];
const ssoProviders = [
  { id: 'google', label: 'Google', icon: 'G' },
  { id: 'microsoft-entra-id', label: 'Microsoft', icon: 'M' },
  { id: 'github', label: 'GitHub', icon: null },
];

function roleLabel(role) {
  return role.replaceAll('_', ' ').toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
}

function safeRole(value) {
  return roles.includes(value) ? value : 'COMMUNITY_MEMBER';
}

function safeCallbackUrl(value) {
  if (typeof value !== 'string') return null;
  return value.startsWith('/') && !value.startsWith('//') ? value : null;
}

export function LoginModal({ open, onClose, onSignup, forceOpen = false, error = false, errorMessage, initialRole, initialCallbackUrl }) {
  const { t } = useTranslation();
  const titleId = useId();
  const [selectedRole, setSelectedRole] = useState(() => safeRole(initialRole));
  const [callbackUrl, setCallbackUrl] = useState(() => safeCallbackUrl(initialCallbackUrl) || '/');
  const [resetMessage, setResetMessage] = useState('');
  const [resetLoading, setResetLoading] = useState(false);

  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (event) => {
      if (event.key === 'Escape' && !forceOpen) onClose?.();
    };
    document.addEventListener('keydown', onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [forceOpen, onClose, open]);

  useEffect(() => {
    if (open) setSelectedRole(safeRole(initialRole));
  }, [initialRole, open]);

  useEffect(() => {
    const explicitCallbackUrl = safeCallbackUrl(initialCallbackUrl);
    if (explicitCallbackUrl) {
      setCallbackUrl(explicitCallbackUrl);
      return;
    }
    const currentPath = `${window.location.pathname}${window.location.search}`;
    setCallbackUrl(window.location.pathname === '/login' ? '/' : currentPath);
  }, [initialCallbackUrl]);

  async function startSso(providerId) {
    await fetch('/api/auth/sso-role', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: selectedRole, returnTo: callbackUrl }),
    });
    await signIn(providerId, { callbackUrl });
  }

  async function requestPasswordReset(event) {
    event.preventDefault();
    setResetMessage('');
    setResetLoading(true);
    const formData = new FormData(event.currentTarget);
    formData.set('role', selectedRole);
    const response = await fetch('/api/auth/request-password-reset', {
      method: 'POST',
      body: formData,
    });
    const payload = await response.json().catch(() => ({}));
    setResetLoading(false);
    setResetMessage(payload.message || (response.ok ? 'Check your reset instructions.' : 'Password reset could not be requested.'));
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 px-4 py-8"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onMouseDown={(event) => {
        if (!forceOpen && event.target === event.currentTarget) onClose?.();
      }}
    >
      <div className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-lg border border-slate-200 bg-white p-5 shadow-2xl sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id={titleId} className="text-2xl font-semibold text-slate-950">
              {t('login.title', { defaultValue: 'Login' })}
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              {t('login.subtitle', { defaultValue: 'Choose the role for this account. The same email can have separate role accounts.' })}
            </p>
          </div>
          {forceOpen ? null : (
            <button
              type="button"
              onClick={onClose}
              className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-950"
              aria-label={t('login.close', { defaultValue: 'Close login dialog' })}
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        {error ? (
          <p className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-700">
            {errorMessage || t('login.error', { defaultValue: 'No account was found for that email and role.' })}
          </p>
        ) : null}

        <label className="mt-5 block text-sm font-medium text-slate-700">
          {t('login.role', { defaultValue: 'Role' })}
          <select
            value={selectedRole}
            onChange={(event) => setSelectedRole(event.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2"
          >
            {roles.map((role) => (
              <option key={role} value={role}>{roleLabel(role)}</option>
            ))}
          </select>
        </label>

        <div className="mt-4 grid gap-2">
          {ssoProviders.map((provider) => (
            <button
              key={provider.id}
              type="button"
              onClick={() => startSso(provider.id)}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-50"
            >
              {provider.id === 'github' ? <Github className="h-4 w-4" /> : <span className="font-bold">{provider.icon}</span>}
              {t('login.continueWith', { provider: provider.label, defaultValue: `Continue with ${provider.label}` })}
            </button>
          ))}
        </div>

        <div className="my-5 flex items-center gap-3 text-xs uppercase tracking-wide text-slate-400">
          <span className="h-px flex-1 bg-slate-200" />
          {t('login.or', { defaultValue: 'or' })}
          <span className="h-px flex-1 bg-slate-200" />
        </div>

        <form action="/api/auth/login" method="post" className="space-y-4">
          <input type="hidden" name="role" value={selectedRole} />
          <input type="hidden" name="callbackUrl" value={callbackUrl} />
          <label className="block text-sm font-medium text-slate-700">
            {t('login.email', { defaultValue: 'Email' })}
            <input
              name="email"
              type="email"
              defaultValue="admin@algostories.local"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
              required
            />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            {t('login.password', { defaultValue: 'Password' })}
            <input
              name="password"
              type="password"
              autoComplete="current-password"
              placeholder={t('login.passwordPlaceholder', { defaultValue: 'Leave blank only for old test accounts' })}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
            />
          </label>
          <button className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md bg-slate-900 px-4 py-2 font-semibold text-white hover:bg-slate-800">
            <Mail className="h-4 w-4" />
            {t('login.legacySubmit', { defaultValue: 'Login with email' })}
          </button>
        </form>

        <p className="mt-4 text-sm text-slate-600">
          {t('login.noAccount', { defaultValue: 'No account?' })}{' '}
          {onSignup ? (
            <button type="button" onClick={onSignup} className="font-semibold text-blue-700">
              {t('login.signUp', { defaultValue: 'Sign up' })}
            </button>
          ) : (
            <Link href="/signup" className="font-semibold text-blue-700">
              {t('login.signUp', { defaultValue: 'Sign up' })}
            </Link>
          )}
        </p>
        <details className="mt-4 rounded-md border border-slate-200 p-3 text-sm">
          <summary className="cursor-pointer font-semibold text-slate-800">Forgot password?</summary>
          <form onSubmit={requestPasswordReset} className="mt-3 space-y-3">
            <p className="text-sm leading-6 text-slate-600">
              Email reset is not configured yet. Submit your email and role to see the current recovery instruction.
            </p>
            <label className="block text-sm font-medium text-slate-700">
              Email
              <input name="email" type="email" className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" required />
            </label>
            <button disabled={resetLoading} className="inline-flex min-h-10 items-center rounded-md border border-slate-300 px-3 py-2 font-semibold hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-70">
              {resetLoading ? 'Checking...' : 'Request reset'}
            </button>
            {resetMessage ? <p className="rounded-md bg-amber-50 p-3 text-sm leading-6 text-amber-800">{resetMessage}</p> : null}
          </form>
        </details>
      </div>
    </div>
  );
}
