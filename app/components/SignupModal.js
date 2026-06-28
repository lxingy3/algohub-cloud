'use client';

import Link from 'next/link';
import { useEffect, useId, useState } from 'react';
import { X } from 'lucide-react';
import { SignupSsoButtons } from '../signup/SignupSsoButtons';

export function SignupModal({ open, onClose, onLogin, forceOpen = false, errorMessage }) {
  const titleId = useId();
  const [callbackUrl, setCallbackUrl] = useState('/');

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
    if (!open) return;
    const currentPath = `${window.location.pathname}${window.location.search}`;
    setCallbackUrl(window.location.pathname === '/signup' ? '/' : currentPath);
  }, [open]);

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
            <h1 id={titleId} className="text-2xl font-semibold text-slate-950">Signup</h1>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Create a community member account. Admins can upgrade roles later when needed.
            </p>
          </div>
          {forceOpen ? null : (
            <button
              type="button"
              onClick={onClose}
              className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-950"
              aria-label="Close signup dialog"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        {errorMessage ? <p className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{errorMessage}</p> : null}
        <SignupSsoButtons />
        <div className="my-5 flex items-center gap-3 text-xs uppercase tracking-wide text-slate-400">
          <span className="h-px flex-1 bg-slate-200" />
          or
          <span className="h-px flex-1 bg-slate-200" />
        </div>
        <form action="/api/auth/signup" method="post" className="space-y-4">
          <input type="hidden" name="callbackUrl" value={callbackUrl} />
          <label className="block text-sm font-medium text-slate-700">
            Name
            <input name="name" className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" required />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Email
            <input name="email" type="email" className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" required />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Password
            <input name="password" type="password" minLength={8} autoComplete="new-password" className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" required />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Confirm password
            <input name="confirmPassword" type="password" minLength={8} autoComplete="new-password" className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" required />
          </label>
          <button className="inline-flex min-h-11 w-full items-center justify-center rounded-md bg-slate-900 px-4 py-2 font-semibold text-white hover:bg-slate-800">
            Create account
          </button>
        </form>
        <p className="mt-4 text-sm text-slate-600">
          Already have one?{' '}
          {onLogin ? (
            <button type="button" onClick={onLogin} className="inline-flex min-h-8 items-center font-semibold text-blue-700">Login</button>
          ) : (
            <Link href="/login" className="inline-flex min-h-8 items-center font-semibold text-blue-700">Login</Link>
          )}
        </p>
      </div>
    </div>
  );
}
