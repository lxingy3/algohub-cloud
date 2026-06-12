'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { LanguageSelector } from './LanguageSelector';
import { IdleLogoutManager } from './IdleLogoutManager';
import { LoginModal } from './LoginModal';
import { SignupModal } from './SignupModal';
import { SetPasswordModal } from './SetPasswordModal';

const navItems = [
  ['/', 'nav.home'],
  ['/algorithms', 'nav.algorithms'],
  ['/stories', 'nav.stories'],
  ['/events', 'nav.events'],
  ['/about', 'nav.about'],
];

const passwordReminderPrefix = 'algohub_password_setup_later:';

const loginErrors = {
  'not-found': 'No account was found for that email and role.',
  'invalid-password': 'The password is incorrect.',
  'password-not-set': 'This account does not have a password yet. For this test phase, leave the password blank or use social login, then set a password after login.',
};

const signupErrors = {
  'account-exists': 'This email already has an account with that role. Please log in or choose another role.',
  'name-conflict': 'This email and role already belong to another user name. Use the existing account or choose a different role.',
  'password-too-short': 'Password must be at least 8 characters.',
  'password-mismatch': 'Passwords do not match.',
};

export function SiteNavClient({ isLoggedIn, isAdmin, currentUserId = '', needsPasswordSetup = false }) {
  const { t } = useTranslation();
  const [authModal, setAuthModal] = useState(null);
  const [loginConfig, setLoginConfig] = useState({ role: undefined, callbackUrl: undefined });
  const [loginErrorMessage, setLoginErrorMessage] = useState('');
  const [signupErrorMessage, setSignupErrorMessage] = useState('');
  const [passwordReminderOpen, setPasswordReminderOpen] = useState(false);
  const [resetToken, setResetToken] = useState('');

  function openLogin(config = {}) {
    setLoginConfig(config);
    setLoginErrorMessage(config.errorMessage || '');
    setAuthModal('login');
  }

  function openAdminPrompt() {
    setAuthModal('admin-needed');
  }

  useEffect(() => {
    const url = new URL(window.location.href);
    const requestedModal = url.searchParams.get('authModal');
    const shouldOpenLogin = requestedModal === 'login' || url.searchParams.has('authError');
    const shouldOpenSignup = requestedModal === 'signup' || url.searchParams.has('signupError');
    const shouldOpenResetPassword = requestedModal === 'reset-password';
    if (!shouldOpenLogin && !shouldOpenSignup && !shouldOpenResetPassword) return;

    const error = url.searchParams.get('authError');
    const signupError = url.searchParams.get('signupError');
    const role = url.searchParams.get('role');
    const reset = url.searchParams.get('resetToken') || '';
    url.searchParams.delete('authModal');
    url.searchParams.delete('authError');
    url.searchParams.delete('signupError');
    url.searchParams.delete('role');
    url.searchParams.delete('resetToken');
    const cleanReturnTo = `${url.pathname}${url.search}${url.hash}`;
    if (shouldOpenResetPassword) {
      setResetToken(reset);
      setAuthModal('reset-password');
    } else if (shouldOpenSignup) {
      setSignupErrorMessage(signupErrors[signupError] || '');
      setAuthModal('signup');
    } else {
      openLogin({
        role,
        callbackUrl: cleanReturnTo,
        errorMessage: loginErrors[error] || (error ? 'Try signing in with a different account.' : ''),
      });
    }
    window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
  }, []);

  useEffect(() => {
    if (!needsPasswordSetup || !currentUserId) {
      setPasswordReminderOpen(false);
      return;
    }
    const dismissed = window.sessionStorage.getItem(`${passwordReminderPrefix}${currentUserId}`);
    if (!dismissed) setPasswordReminderOpen(true);
  }, [currentUserId, needsPasswordSetup]);

  function dismissPasswordReminder() {
    if (currentUserId) window.sessionStorage.setItem(`${passwordReminderPrefix}${currentUserId}`, '1');
    setPasswordReminderOpen(false);
  }

  function clearPasswordReminderDismissals() {
    for (let index = window.sessionStorage.length - 1; index >= 0; index -= 1) {
      const key = window.sessionStorage.key(index);
      if (key?.startsWith(passwordReminderPrefix)) window.sessionStorage.removeItem(key);
    }
  }

  return (
    <header className="sticky top-0 z-50 border-b border-gray-100 bg-white">
      <div className="mx-auto flex min-h-16 max-w-6xl flex-wrap items-center justify-between gap-2 px-3 py-2 sm:px-4 md:h-16 md:flex-nowrap md:gap-4 md:px-6 md:py-0">
        <Link href="/" className="flex min-h-11 items-center gap-2">
          <img src="/newlogo.png" alt="AlgoStories Logo" className="h-7 w-auto sm:h-8" />
        </Link>
        <nav className="hidden items-center gap-1 text-sm md:flex">
          {navItems.map(([href, label]) => (
            <Link key={href} href={href} className="rounded-md px-4 py-2 font-medium text-gray-800 hover:bg-gray-100">
              {t(label)}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-1 text-sm md:gap-2">
          <LanguageSelector />
          {isLoggedIn ? (
            <Link href="/my-stories" className="hidden rounded-md px-3 py-2 font-medium text-gray-700 hover:bg-gray-100 md:inline-flex">
              {t('nav.myStories')}
            </Link>
          ) : null}
          {!isLoggedIn ? (
            <button type="button" onClick={() => openLogin()} className="inline-flex min-h-11 items-center rounded-md px-2 py-2 font-medium text-gray-700 hover:bg-gray-100 sm:px-3 md:min-h-0">
              {t('nav.login')}
            </button>
          ) : null}
          {isAdmin ? (
            <Link href="/admin" className="inline-flex min-h-11 items-center rounded-md border border-gray-200 px-2 py-2 font-medium text-gray-800 hover:bg-gray-100 sm:px-3 md:min-h-0">
              {t('nav.admin')}
            </Link>
          ) : (
            <button type="button" onClick={openAdminPrompt} className="inline-flex min-h-11 items-center rounded-md border border-gray-200 px-2 py-2 font-medium text-gray-800 hover:bg-gray-100 sm:px-3 md:min-h-0">
              {t('nav.admin')}
            </button>
          )}
          {isLoggedIn ? (
            <form action="/api/auth/logout" method="post">
              <button onClick={clearPasswordReminderDismissals} className="min-h-11 rounded-md px-3 py-2 font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-900 md:min-h-0">
                {t('nav.logout')}
              </button>
            </form>
          ) : null}
        </div>
        <nav className="scrollbar-none order-3 -mx-1 flex w-full gap-1 overflow-x-auto pb-1 text-sm [-webkit-overflow-scrolling:touch] md:hidden">
          {navItems.map(([href, label]) => (
            <Link key={href} href={href} className="inline-flex min-h-11 shrink-0 items-center rounded-md px-3 py-2 font-medium text-gray-800 hover:bg-gray-100">
              {t(label)}
            </Link>
          ))}
          {isLoggedIn ? (
            <Link href="/my-stories" className="inline-flex min-h-11 shrink-0 items-center rounded-md px-3 py-2 font-medium text-gray-800 hover:bg-gray-100">
              {t('nav.myStories')}
            </Link>
          ) : null}
        </nav>
      </div>
      <AdminLoginNeededModal
        open={authModal === 'admin-needed'}
        onClose={() => setAuthModal(null)}
        onLogin={() => openLogin({ role: 'ADMIN', callbackUrl: '/admin' })}
      />
      <LoginModal
        key={`${loginConfig.role || 'default'}-${loginConfig.callbackUrl || 'current'}`}
        open={authModal === 'login'}
        onClose={() => setAuthModal(null)}
        onSignup={() => {
          setSignupErrorMessage('');
          setAuthModal('signup');
        }}
        error={Boolean(loginErrorMessage)}
        errorMessage={loginErrorMessage}
        initialRole={loginConfig.role}
        initialCallbackUrl={loginConfig.callbackUrl}
      />
      <SignupModal
        open={authModal === 'signup'}
        onClose={() => setAuthModal(null)}
        onLogin={() => {
          setSignupErrorMessage('');
          openLogin();
        }}
        errorMessage={signupErrorMessage}
      />
      <PasswordSetupReminderModal
        open={passwordReminderOpen && authModal === null}
        onLater={dismissPasswordReminder}
        onSetPassword={() => {
          setPasswordReminderOpen(false);
          setAuthModal('set-password');
        }}
      />
      <SetPasswordModal
        open={authModal === 'set-password' || authModal === 'reset-password'}
        onClose={() => setAuthModal(null)}
        onSaved={() => {
          setResetToken('');
          setAuthModal(null);
          window.location.reload();
        }}
        resetToken={authModal === 'reset-password' ? resetToken : ''}
      />
      <IdleLogoutManager isLoggedIn={isLoggedIn} />
    </header>
  );
}

function PasswordSetupReminderModal({ open, onLater, onSetPassword }) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 px-4 py-8"
      role="dialog"
      aria-modal="true"
      aria-labelledby="password-reminder-title"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onLater?.();
      }}
    >
      <div className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-6 shadow-2xl">
        <h1 id="password-reminder-title" className="text-2xl font-semibold text-slate-950">Your account does not have a password yet</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          This account is still using the temporary no-password test login. Set a password to make it safer before production use.
        </p>
        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          <button type="button" onClick={onSetPassword} className="inline-flex min-h-11 items-center justify-center rounded-md bg-slate-900 px-4 py-2 font-semibold text-white hover:bg-slate-800">
            Set password
          </button>
          <button type="button" onClick={onLater} className="inline-flex min-h-11 items-center justify-center rounded-md border border-slate-300 px-4 py-2 font-semibold text-slate-800 hover:bg-slate-50">
            Later
          </button>
        </div>
      </div>
    </div>
  );
}

function AdminLoginNeededModal({ open, onClose, onLogin }) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 px-4 py-8"
      role="dialog"
      aria-modal="true"
      aria-labelledby="admin-login-needed-title"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose?.();
      }}
    >
      <div className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-6 shadow-2xl">
        <h1 id="admin-login-needed-title" className="text-2xl font-semibold text-slate-950">Admin login needed</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Log in with the admin account first: admin@algostories.local
        </p>
        <button type="button" onClick={onLogin} className="mt-5 inline-flex min-h-11 items-center rounded-md bg-slate-900 px-4 py-2 font-semibold text-white hover:bg-slate-800">
          Go to login
        </button>
      </div>
    </div>
  );
}
